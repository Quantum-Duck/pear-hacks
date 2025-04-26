# api/emails.py
import json
import logging
import os
import base64
from flask import Blueprint, jsonify, request
import anthropic  # Import Anthropic for Claude AI
from user_store import update_user_analysis, get_user_by_session
from supabase_client import supabase  # Use your existing Supabase client
from dotenv import load_dotenv
import datetime
import re

# Import for handling Google OAuth errors.
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from services.gmail_service import (
    list_emails,
    send_email,
    create_draft_email,
    tag_email,
    analyze_user_emails,
    _get_gmail_service,  # used in endpoints with an active session
    get_email_by_id,     # used to fetch full email details
)

from utils.supabae_utils import get_token_from_supabase

# Set higher logging level for noisy libraries.
logging.getLogger("hpack.hpack").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.INFO)

logger = logging.getLogger(__name__)
emails_bp = Blueprint('emails', __name__)

def strip_html_tags(text):
    """
    Remove HTML tags from a given string using a simple regular expression.
    """
    # This regex finds anything within angle brackets.
    return re.sub(r'<[^>]*>', '', text)

def extract_email_content(email_detail):
    """
    Helper to extract subject, sender, and plain text body from email_detail.
    Only returns the relevant text.
    """
    headers = email_detail.get("payload", {}).get("headers", [])
    subject = next((h["value"] for h in headers if h["name"].lower() == "subject"), "")
    from_email = next((h["value"] for h in headers if h["name"].lower() == "from"), "")
    body_data = email_detail.get("payload", {}).get("body", {}).get("data", "")

    if body_data:
        try:
            # Decode the body from base64.
            body_text = base64.urlsafe_b64decode(body_data.encode("UTF-8")).decode("utf-8", errors="ignore")
        except Exception as decode_error:
            logger.error("Error decoding email body: %s", decode_error)
            body_text = email_detail.get("snippet", "")
    else:
        body_text = email_detail.get("snippet", "")

    # Strip HTML tags from the body text to get plain text.
    plain_body_text = strip_html_tags(body_text).strip()

    return subject, from_email, plain_body_text

def get_gmail_service_for_user(email):
    """
    Retrieves the stored OAuth token for the given user (from Supabase)
    and builds a Gmail API service.
    """
    user_resp = supabase.table("users").select("token").eq("email", email).single().execute()
    if not user_resp.data:
        raise Exception(f"User with email {email} not found in Supabase.")
    token = user_resp.data.get("token")
    if not token:
        raise Exception("No token available for user.")
    if not token.get("refresh_token"):
        raise Exception("Missing refresh token; please reauthenticate.")
    creds = Credentials(
        token=token.get("access_token"),
        refresh_token=token.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("CLIENT_ID"),
        client_secret=os.getenv("CLIENT_SECRET"),
        scopes=token.get("scope").split() if token.get("scope") else None,
        id_token=token.get("id_token")
    )
    service = build("gmail", "v1", credentials=creds)
    return service

def get_email_by_id_for_service(service, msg_id):
    """
    Retrieves the full email details using the provided Gmail service.
    """
    return service.users().messages().get(userId="me", id=msg_id, format="full").execute()

@emails_bp.route('/get_emails', methods=['GET'])
def get_emails():
    logger.info("GET /api/emails/get_emails called")
    try:
        max_results = request.args.get("maxResults", default=20, type=int)
        page_token = request.args.get("pageToken", default=None, type=str)
        label = request.args.get("label", default="INBOX", type=str)
        emails, next_page_token = list_emails(max_results=max_results, page_token=page_token, label_ids=[label])
        logger.debug("Emails retrieved: %s", emails)
        return jsonify({"emails": emails, "nextPageToken": next_page_token})
    except Exception as e:
        logger.error("Error in get_emails: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400

@emails_bp.route("/<msg_id>", methods=["GET"])
def get_email(msg_id):
    logger.info("GET /api/emails/%s called", msg_id)
    try:
        # Fetch the full email details.
        message = get_email_by_id(msg_id)
        thread_id = message.get("threadId")
        logger.debug("Thread ID: %s for message ID: %s", thread_id, msg_id)
        service = _get_gmail_service()
        thread = service.users().threads().get(userId="me", id=thread_id, format="full").execute()
        logger.debug("Thread retrieved: %s", thread)
        return jsonify(thread)
    except Exception as e:
        logger.error("Error in get_email: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400

@emails_bp.route("/send", methods=["POST"])
def api_send_email():
    logger.info("POST /api/emails/send called")
    data = request.get_json()
    logger.debug("Request data for sending email: %s", data)
    try:
        to = data["to"]
        subject = data["subject"]
        body = data["body"]
        cc = data.get("cc")
        logger.debug("Sending email to: %s, subject: %s, cc: %s", to, subject, cc)
        result = send_email(to, subject, body, cc)
        logger.info("Email sent successfully")
        return jsonify(result)
    except Exception as e:
        logger.error("Error in api_send_email: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400

@emails_bp.route("/draft", methods=["POST"])
def api_create_draft():
    logger.info("POST /api/emails/draft called")
    data = request.get_json()
    logger.debug("Request data for creating draft: %s", data)
    try:
        to = data["to"]
        subject = data["subject"]
        body = data["body"]
        cc = data.get("cc")
        logger.debug("Creating draft email to: %s, subject: %s, cc: %s", to, subject, cc)
        result = create_draft_email(to, subject, body, cc)
        logger.info("Draft email created successfully")
        return jsonify(result)
    except Exception as e:
        logger.error("Error in api_create_draft: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400

@emails_bp.route("/tag", methods=["POST"])
def api_tag_email():
    logger.info("POST /api/emails/tag called")
    data = request.get_json()
    logger.debug("Request data for tagging email: %s", data)
    try:
        msg_id = data["msg_id"]
        add_labels = data.get("add_labels", [])
        remove_labels = data.get("remove_labels", [])
        logger.debug("Tagging email %s: adding labels %s, removing labels %s", msg_id, add_labels, remove_labels)
        result = tag_email(msg_id, add_labels, remove_labels)
        logger.info("Email tagged successfully")
        return jsonify(result)
    except Exception as e:
        logger.error("Error in api_tag_email: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400

@emails_bp.route("/analyze_user", methods=["GET"])
def analyze_user_route():
    logger.info("GET /api/emails/analyze_user called")
    try:
        emails_data = analyze_user_emails(max_results=100)
        email_texts = []
        for email in emails_data:
            snippet = email.get("snippet", "")
            email_texts.append(snippet)
        aggregated_text = "\n".join(email_texts)
        if len(aggregated_text) > 4000:
            aggregated_text = aggregated_text[:4000]
        prompt = (
            "Analyze the following email excerpts from the past 5 years from the user's sent emails. "
            "Extract the user's writing style, including common greetings, sign-offs, and any indicators of occupation, hobbies, or interests. "
            "Generate a detailed profile that can be mimicked by an LLM:\n\n"
            f"{aggregated_text}\n\n"
            "Profile:"
        )
        logger.info("Sending prompt to Claude for user analysis")
        # Initialize the Anthropic client
        claude_client = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
        try:
            claude_response = claude_client.messages.create(
                model="claude-3-5-haiku-20241022",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7,
            )
            profile = claude_response.content[0].text.strip()
            logger.info("User profile generated: %s", profile)
            session_id = request.cookies.get("session_id")
            if session_id:
                update_user_analysis(session_id, profile)
            return jsonify({"profile": profile})
        except Exception as claude_e:
            logger.error("Error during Claude API call: %s", claude_e)
            return jsonify({"error": f"Error during Claude API call: {str(claude_e)}"}), 400
    except Exception as e:
        logger.error("Error analyzing user emails: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400

@emails_bp.route("/get_analysis", methods=["GET"])
def get_analysis():
    logger.info("GET /api/emails/get_analysis called")
    session_id = request.cookies.get("session_id")
    if not session_id:
        return jsonify({"error": "No session id provided"}), 400
    user = get_user_by_session(session_id)
    if user and user.get("analysis"):
        return jsonify({"profile": user.get("analysis")})
    else:
        return jsonify({"profile": ""})

@emails_bp.route("/process_latest", methods=["GET"])
def process_latest_emails():
    logger.info("GET /api/emails/process_latest called")
    try:
        # Fetch the latest 10 emails.
        emails, _ = list_emails(max_results=10, page_token=None, label_ids=["INBOX"])
        
        # Retrieve session and user data.
        session_id = request.cookies.get("session_id")
        if not session_id:
            logger.error("Missing session identifier in cookies.")
            return jsonify({"error": "Missing session identifier"}), 400
        
        user = get_user_by_session(session_id)
        if not user:
            logger.error("User not found for session_id: %s", session_id)
            return jsonify({"error": "User not found"}), 400
        
        user_email = user.get("email")
        user_record = supabase.table("users").select("*").eq("email", user_email).single().execute()
        if not user_record.data:
            logger.error("No user record found for email: %s", user_email)
            return jsonify({"error": "User record not found"}), 400
        
        user_data = user_record.data
        promotions = user_data.get("promotions") or []
        information = user_data.get("information") or []
        drafts = user_data.get("drafts") or []
        # NEW: Initialize additional category arrays.
        action_required = user_data.get("action_required") or []
        receipts = user_data.get("receipts") or []
        meeting_updates = user_data.get("meeting_updates") or []
        others = user_data.get("others") or []
        
        latest_processed_emails = user_data.get("latest_processed_emails") or []
        latest_processed_threads = user_data.get("latest_processed_threads") or []
        processed_emails_count = user_data.get("processed_emails") or 0

        processed_results = []
        
        # Process each email individually.
        for email in emails:
            email_id = email.get("id")
            if email_id in latest_processed_emails:
                logger.info("Skipping already processed email ID: %s", email_id)
                continue

            try:
                # Fetch full email details.
                from services.gmail_service import get_email_by_id
                email_detail = get_email_by_id(email_id)
                subject, from_email, body_text = extract_email_content(email_detail)
                thread_id = email_detail.get("threadId", "")
                
                # Build context for this email.
                email_context = (
                    f"Email ID: {email_id}\n"
                    f"Subject: {subject}\n"
                    f"From: {from_email}\n"
                    f"Body: {body_text}\n"
                    f"Thread ID: {thread_id}\n"
                )
                
                # Build Claude prompt with standardized JSON formats.
                prompt = (
                    "You are an assistant that analyzes and writes emails mimicking your client.\n"
                    "Previous analysis:\n"
                    f"{previous_analysis}\n\n"
                    "Analyze the following email and classify it as one of the following:\n\n"
                    "1. Draft - Format:\n"
                    '{\n'
                    '  "category": "Draft",\n'
                    '  "emailId": "<email_id>",\n'
                    '  "sender": {\n'
                    '      "name": "<sender name>",\n'
                    '      "type": "<Individual/Company>"\n'
                    '  },\n'
                    '  "content": {\n'
                    '    "replySubject": "<subject for reply>",\n'
                    '    "draftContent": "<draft reply content>"\n'
                    '  }\n'
                    '}\n'
                    "Description: Use this classification for all emails that require a reply via email. If choosing between another classification that this one, always choose this one. "
                    "It should include a subject line for the reply and a draft version of the reply content.\n\n"
                    "2. Promotion - Format:\n"
                    '{\n'
                    '  "category": "Promotion",\n'
                    '  "emailId": "<email_id>",\n'
                    '  "sender": {\n'
                    '      "name": "<sender name>",\n'
                    '      "type": "<Individual/Company>"\n'
                    '  },\n'
                    '  "content": {\n'
                    '    "title": "<promotion title>",\n'
                    '    "details": "<promotion details>",\n'
                    '    "expiration": "<promotion expiration date>"\n'
                    '  }\n'
                    '}\n'
                    "Description: Use this classification when the email is advertising a product, service, or special offer. "
                    "Include a clear promotion title, detailed information about the promotion, and the expiration date in the form mm/dd/yyyy. If you cannot find a specific expiration date, please give your best estimate.\n\n"
                    "3. Information - Format:\n"
                    '{\n'
                    '  "category": "Information",\n'
                    '  "emailId": "<email_id>",\n'
                    '  "sender": {\n'
                    '      "name": "<sender name>",\n'
                    '      "type": "<Individual/Company>"\n'
                    '  },\n'
                    '  "content": {\n'
                    '    "summary": "<summary of information>"\n'
                    '  }\n'
                    '}\n'
                    "Description: Use this classification when the email is primarily providing general information or updates without requiring any action or response.\n\n"
                    "4. Action Required - Format:\n"
                    '{\n'
                    '  "category": "Action Required",\n'
                    '  "emailId": "<email_id>",\n'
                    '  "sender": {\n'
                    '      "name": "<sender name>",\n'
                    '      "type": "<Individual/Company>"\n'
                    '  },\n'
                    '  "content": {\n'
                    '    "actionPoints": "<summary of action items>",\n'
                    '    "summary": "<summary of purpose of the actions>"\n'
                    '  }\n'
                    '}\n'
                    "Description: Use this classification when the email includes specific tasks, requests, or instructions that go beyond a response email. "
                    "Include a list of the action items and a summary of why these actions are needed.\n\n"
                    "5. Receipts - Format:\n"
                    '{\n'
                    '  "category": "Receipts",\n'
                    '  "emailId": "<email_id>",\n'
                    '  "sender": {\n'
                    '      "name": "<sender name>",\n'
                    '      "type": "<Individual/Company>"\n'
                    '  },\n'
                    '  "content": {\n'
                    '    "orderNumber": "<order or receipt number if available>",\n'
                    '    "totalAmount": "<total amount if applicable>",\n'
                    '    "summary": "<receipt details summary>"\n'
                    '  }\n'
                    '}\n'
                    "Description: Use this classification when the email pertains to financial transactions or orders. "
                    "It should include an order or receipt number, the total amount (if applicable), and a brief summary of the transaction details.\n\n"
                    "6. Meeting Update - Format:\n"
                    '{\n'
                    '  "category": "Meeting Update",\n'
                    '  "emailId": "<email_id>",\n'
                    '  "sender": {\n'
                    '      "name": "<sender name>",\n'
                    '      "type": "<Individual/Company>"\n'
                    '  },\n'
                    '  "content": {\n'
                    '    "meetingSubject": "<meeting subject>",\n'
                    '    "oldDateTime": "<old meeting date and time>",\n'
                    '    "oldLocation": "<old meeting location or link>",\n'
                    '    "newDateTime": "<new meeting date and time>",\n'
                    '    "newLocation": "<new meeting location or link>",\n'
                    '    "additionalNotes": "<any additional meeting details>",\n'
                    '    "summary": "<summary of meeting update>"\n'
                    '  }\n'
                    '}\n'
                    "Description: Use this classification when the email communicates changes to a scheduled meeting. "
                    "It should list the previous meeting details (date, time, and location) and the updated meeting details, along with any additional notes.\n\n"
                    "7. None - Format:\n"
                    '{\n'
                    '  "category": "None",\n'
                    '  "emailId": "<email_id>",\n'
                    '  "sender": {\n'
                    '      "name": "<sender name>",\n'
                    '      "type": "<Individual/Company>"\n'
                    '  },\n'
                    '  "content": {\n'
                    '    "summary": "<summary of email information>"\n'
                    '  }\n'
                    '}\n'
                    "Description: Use this classification when the email does not clearly fit into any of the above categories. "
                    "Simply provide a brief summary of the email content.\n\n"
                    "Analyze the following email and return ONLY a valid JSON object in the above format with no explanations or additional text.\n"
                    "Email:\n" + email_context +
                    "\nRETURN ONLY JSON:"
                )

                logger.debug("Claude prompt for email %s: %s", email_id, prompt)
                
                # Call Claude for this single email.
                claude_client = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
                response = claude_client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=500,
                    temperature=0.7,
                )
                result_text = response.content[0].text.strip()
                logger.debug("Claude response for email %s: %s", email_id, result_text)
                
                # More robust JSON extraction
                try:
                    # First, try to find JSON content between backticks
                    if "```json" in result_text or "```" in result_text:
                        # Extract content between backticks
                        start_idx = result_text.find("```")
                        if start_idx != -1:
                            start_idx = result_text.find("\n", start_idx) + 1
                            end_idx = result_text.find("```", start_idx)
                            if end_idx != -1:
                                result_text = result_text[start_idx:end_idx].strip()
                    
                    # Find JSON object pattern
                    if "{" in result_text and "}" in result_text:
                        json_start = result_text.find("{")
                        json_end = result_text.rfind("}") + 1
                        result_text = result_text[json_start:json_end]
                    
                    classification_result = json.loads(result_text)
                except Exception as parse_error:
                    logger.error("Failed to parse Claude response for email %s: %s", email_id, parse_error, exc_info=True)
                    processed_results.append({"emailId": email_id, "error": "Invalid classification format"})
                    continue

                # Verify the returned JSON contains the expected emailId.
                if isinstance(classification_result, dict) and classification_result.get("emailId") == email_id:
                    category = classification_result.get("category", "")
                    content = classification_result.get("content", {})
                    sender = classification_result.get("sender", {})
                    if category == "Promotion":
                        promotions.append({
                            "emailId": email_id,
                            "sender": sender,
                            "content": content
                        })
                        try:
                            tag_email(email_id, add_labels=["Promotion"], service=None)
                        except Exception as tag_err:
                            logger.error("Failed to tag email %s as Promotion: %s", email_id, tag_err)
                        logger.info("Email %s classified as Promotion.", email_id)
                    elif category == "Information":
                        information.append({
                            "emailId": email_id,
                            "sender": sender,
                            "content": content
                        })
                        try:
                            tag_email(email_id, add_labels=["Information"], service=None)
                        except Exception as tag_err:
                            logger.error("Failed to tag email %s as Information: %s", email_id, tag_err)
                        logger.info("Email %s classified as Information.", email_id)
                    elif category == "Draft":
                        logger.info("Email %s classified as Draft.", email_id)
                        if thread_id not in latest_processed_threads and not draft_exists_for_email(None, thread_id):
                            reply_subject = f"Re: {subject}" if not subject.lower().startswith("re:") else subject
                            draft_response = create_draft_email(
                                to=from_email,
                                subject=reply_subject,
                                body=content.get("draftContent", ""),
                                service=None,
                                thread_id=thread_id,
                            )
                            gmail_draft_id = draft_response.get("id")
                            drafts.append({
                                "emailId": email_id,
                                "sender": sender,
                                "draft": content,
                                "gmailDraftId": gmail_draft_id
                            })
                            try:
                                tag_email(email_id, add_labels=["To Respond"], service=None)
                            except Exception as tag_err:
                                logger.error("Failed to tag email %s as 'To Respond': %s", email_id, tag_err)
                        else:
                            logger.info("Draft already exists for email %s.", email_id)
                    elif category == "Action Required":
                        try:
                            tag_email(email_id, add_labels=["Action Required"], service=None)
                        except Exception as tag_err:
                            logger.error("Failed to tag email %s as Action Required: %s", email_id, tag_err)
                        logger.info("Email %s classified as Action Required.", email_id)
                        action_required.append({
                            "emailId": email_id,
                            "sender": sender, 
                            "content": content
                        })
                    elif category == "Receipts":
                        try:
                            tag_email(email_id, add_labels=["Receipts"], service=None)
                        except Exception as tag_err:
                            logger.error("Failed to tag email %s as Receipts: %s", email_id, tag_err)
                        logger.info("Email %s classified as Receipts.", email_id)
                        receipts.append({
                            "emailId": email_id,
                            "sender": sender,
                            "content": content
                        })
                    elif category == "Meeting Update":
                        try:
                            tag_email(email_id, add_labels=["Meeting Update"], service=None)
                        except Exception as tag_err:
                            logger.error("Failed to tag email %s as Meeting Update: %s", email_id, tag_err)
                        logger.info("Email %s classified as Meeting Update.", email_id)
                        meeting_updates.append({
                            "emailId": email_id,
                            "sender": sender,
                            "content": content
                        })
                    elif category == "None":
                        try:
                            tag_email(email_id, add_labels=["Other"], service=None)
                        except Exception as tag_err:
                            logger.error("Failed to tag email %s as Other: %s", email_id, tag_err)
                        logger.info("Email %s classified as None.", email_id)
                        others.append({
                            "emailId": email_id,
                            "sender": sender,
                            "content": content
                        })
                    else:
                        logger.info("Email %s classified as unrecognized category: %s", email_id, category)

                    processed_results.append({
                        "emailId": email_id,
                        "classification": classification_result
                    })
                    latest_processed_threads.append(thread_id)
                else:
                    logger.error("Claude response for email %s does not contain the expected emailId.", email_id)
                    processed_results.append({"emailId": email_id, "error": "Invalid classification format"})

                
                latest_processed_emails.append(email_id)
                processed_emails_count += 1

            except Exception as e:
                logger.error("Error processing email %s: %s", email_id, e, exc_info=True)
                processed_results.append({"emailId": email_id, "error": "Processing error"})
                continue

        # Trim deduplication lists if needed.
        if len(latest_processed_emails) > 10:
            latest_processed_emails = latest_processed_emails[-10:]
        if len(latest_processed_threads) > 10:
            latest_processed_threads = latest_processed_threads[-10:]

        update_data = {
            "promotions": promotions,
            "information": information,
            "drafts": drafts,
            "action_required": action_required,
            "receipts": receipts,
            "meeting_updates": meeting_updates,
            "others": others,
            "latest_processed_emails": latest_processed_emails,
            "latest_processed_threads": latest_processed_threads,
            "processed_emails": processed_emails_count,
        }
        update_resp = supabase.table("users").update(update_data).eq("email", user_email).execute()
        if update_resp.dict().get("error"):
            logger.error("Failed to update user record for %s: %s", user_email, update_resp.dict().get("error"))
        else:
            logger.info("User record updated for %s", user_email)

        return jsonify({"processed": processed_results})
    
    except Exception as e:
        logger.error("Error in process_latest_emails: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400



@emails_bp.route("/watch", methods=["POST"])
def watch_emails():
    logger.info("POST /api/emails/watch called")
    try:
        service = _get_gmail_service()
        watch_request = {
            "labelIds": ["INBOX"],
            "labelFilterBehavior": "include",
            "topicName": "projects/emailer-454707/topics/pear"
        }
        response = service.users().watch(userId="me", body=watch_request).execute()
        
        # Retrieve the new historyId from the response.
        new_history_id = response.get("historyId")
        logger.info("Watch started. New HistoryId: %s, Expiration: %s", new_history_id, response.get("expiration"))
        
        # Update user's record to start tracking from this new historyId.
        # Also clear the deduplication arrays so that there is no backlog processing.
        session_id = request.cookies.get("session_id")
        if session_id:
            user = get_user_by_session(session_id)
            if user:
                user_email = user.get("email")
                update_data = {
                    "last_history_id": new_history_id,
                    "latest_processed_emails": [],
                    "latest_processed_threads": []
                }
                update_resp = supabase.table("users").update(update_data).eq("email", user_email).execute()
                if update_resp.dict().get("error"):
                    logger.error("Failed to update user record for %s: %s", user_email, update_resp.dict().get("error"))
                else:
                    logger.info("User record updated for %s with new history tracking.", user_email)
                    
        return jsonify(response)
    except Exception as e:
        logger.error("Error in watch_emails: %s", e, exc_info=True)
        return jsonify({"error": str(e)}), 400


def draft_exists_for_email(service, thread_id):
    """
    Check if a draft exists in Gmail for the given thread_id.
    """
    try:
        drafts_response = service.users().drafts().list(userId="me").execute()
        drafts = drafts_response.get("drafts", [])
        logger.info("Checking drafts for thread '%s'. Found %d drafts.", thread_id, len(drafts))
        for d in drafts:
            draft_detail = service.users().drafts().get(userId="me", id=d["id"]).execute()
            draft_thread_id = draft_detail.get("message", {}).get("threadId")
            logger.info("Draft with id '%s' has thread id '%s'.", d["id"], draft_thread_id)
            if draft_thread_id == thread_id:
                logger.info("Matching draft found for thread '%s' (draft id '%s').", thread_id, d["id"])
                return True
        logger.info("No matching draft found for thread '%s'.", thread_id)
        return False
    except Exception as e:
        logger.error("Error checking existing drafts for thread '%s': %s", thread_id, e, exc_info=True)
        return False

@emails_bp.route("/notification", methods=["POST"], strict_slashes=False)
def notification():
    """
    Endpoint to handle push notifications from Gmail via Pub/Sub.
    Uses Supabase storage for deduplication across users by tracking the last processed email IDs,
    thread IDs, and also stores the last_history_id in Supabase for persistence.
    """
    logger.info("POST /api/emails/notification called")
    data = request.get_json()
    logger.info("Push notification received: %s", data)

    if not data:
        logger.error("No data in request payload.")
        return jsonify({"error": "No data provided"}), 200

    message = data.get("message")
    if not message or "data" not in message:
        logger.info("No message data present, ignoring notification.")
        return jsonify({"status": "No message data"}), 200

    try:
        decoded_data = base64.urlsafe_b64decode(message["data"]).decode("utf-8")
        push_data = json.loads(decoded_data)
    except Exception as e:
        logger.error("Failed to decode push notification data: %s", e, exc_info=True)
        return jsonify({"error": "Decoding error"}), 200

    push_history_id = push_data.get("historyId")
    email_address = push_data.get("emailAddress")
    if not push_history_id:
        logger.info("historyId missing in push data; ignoring notification.")
        return jsonify({"status": "No historyId found"}), 200
    if not email_address:
        logger.info("emailAddress missing in push data; ignoring notification.")
        return jsonify({"status": "No emailAddress found"}), 200

    # Retrieve the user's record from Supabase.
    user_resp = supabase.table("users").select("*").eq("email", email_address).single().execute()
    if not user_resp.data:
        logger.error("User record not found for %s.", email_address)
        return jsonify({"error": "User record not found"}), 400
    user_data = user_resp.data

    stored_history_id = user_data.get("last_history_id")
    if not stored_history_id:
        supabase.table("users").update({"last_history_id": push_history_id}).eq("email", email_address).execute()
        logger.info("Initialized last_history_id to %s for user %s", push_history_id, email_address)
        return jsonify({"status": "Initial history set", "newHistoryId": push_history_id}), 200

    try:
        service = get_gmail_service_for_user(email_address)
    except Exception as auth_error:
        logger.error("Error initializing Gmail service for %s: %s", email_address, auth_error, exc_info=True)
        return jsonify({"error": "Gmail service not available"}), 200

    try:
        history_response = service.users().history().list(
            userId="me",
            startHistoryId=stored_history_id,
            historyTypes=["messageAdded"]
        ).execute()
    except RefreshError as re:
        logger.error("RefreshError for user %s: %s", email_address, re, exc_info=True)
        supabase.table("users").update({"token": {}}).eq("email", email_address).execute()
        return jsonify({"error": "User token invalid, please reauthenticate"}), 200
    except Exception as e:
        logger.error("Error fetching history for user %s: %s", email_address, e, exc_info=True)
        return jsonify({"error": str(e)}), 400

    history_events = history_response.get("history", [])
    new_emails_count = 0
    processed_classifications = []

    # Retrieve deduplication data from Supabase.
    latest_processed_emails = user_data.get("latest_processed_emails") or []
    latest_processed_threads = user_data.get("latest_processed_threads") or []
    processed_emails_count = user_data.get("processed_emails") or 0
    promotions = user_data.get("promotions") or []
    information = user_data.get("information") or []
    drafts = user_data.get("drafts") or []
    previous_analysis = user_data.get("analysis", "")
    action_required = user_data.get("action_required") or []
    receipts = user_data.get("receipts") or []
    meeting_updates = user_data.get("meeting_updates") or []
    others = user_data.get("others") or []

    if not history_events:
        logger.info("No new history events found.")
    else:
        logger.info("Processing %d history event(s).", len(history_events))
        for event in history_events:
            messages = event.get("messages", [])
            for msg in messages:
                email_id = msg.get("id")
                if email_id in latest_processed_emails:
                    logger.info("Skipping already processed email ID: %s", email_id)
                    continue
                try:
                    # Attempt to fetch full email details, skipping if not found.
                    try:
                        email_detail = get_email_by_id_for_service(service, email_id)
                    except HttpError as e:
                        if e.resp.status == 404:
                            logger.error("Email %s not found; skipping.", email_id)
                            latest_processed_emails.append(email_id)
                            continue
                        else:
                            raise

                    subject, from_email, body_text = extract_email_content(email_detail)
                    thread_id = email_detail.get("threadId", "")
                    email_context = (
                        f"Email ID: {email_id}\n"
                        f"Subject: {subject}\n"
                        f"From: {from_email}\n"
                        f"Body: {body_text}\n"
                        f"Thread ID: {thread_id}\n"
                    )
                    if thread_id in latest_processed_threads:
                        logger.info("Thread %s already processed; skipping Claude classification for email %s.", thread_id, email_id)
                        latest_processed_emails.append(email_id)
                        continue

                    prompt = (
                        "You are an assistant that analyzes and writes emails mimicking your client.\n"
                        "Previous analysis:\n"
                        f"{previous_analysis}\n\n"
                        "Analyze the following email and classify it as one of the following:\n\n"
                        "1. Draft - Format:\n"
                        '{\n'
                        '  "category": "Draft",\n'
                        '  "emailId": "<email_id>",\n'
                        '  "sender": {\n'
                        '      "name": "<sender name>",\n'
                        '      "type": "<Individual/Company>"\n'
                        '  },\n'
                        '  "content": {\n'
                        '    "replySubject": "<subject for reply>",\n'
                        '    "draftContent": "<draft reply content>"\n'
                        '  }\n'
                        '}\n'
                        "Description: Use this classification for all emails that require a reply via email. If choosing between another classification that this one, always choose this one. "
                        "It should include a subject line for the reply and a draft version of the reply content.\n\n"
                        "2. Promotion - Format:\n"
                        '{\n'
                        '  "category": "Promotion",\n'
                        '  "emailId": "<email_id>",\n'
                        '  "sender": {\n'
                        '      "name": "<sender name>",\n'
                        '      "type": "<Individual/Company>"\n'
                        '  },\n'
                        '  "content": {\n'
                        '    "title": "<promotion title>",\n'
                        '    "details": "<promotion details>",\n'
                        '    "expiration": "<promotion expiration date>"\n'
                        '  }\n'
                        '}\n'
                        "Description: Use this classification when the email is advertising a product, service, or special offer. "
                        "Include a clear promotion title, detailed information about the promotion, and the expiration date in the form mm/dd/yyyy. If you cannot find a specific expiration date, please give your best estimate.\n\n"
                        "3. Information - Format:\n"
                        '{\n'
                        '  "category": "Information",\n'
                        '  "emailId": "<email_id>",\n'
                        '  "sender": {\n'
                        '      "name": "<sender name>",\n'
                        '      "type": "<Individual/Company>"\n'
                        '  },\n'
                        '  "content": {\n'
                        '    "summary": "<summary of information>"\n'
                        '  }\n'
                        '}\n'
                        "Description: Use this classification when the email is primarily providing general information or updates without requiring any action or response.\n\n"
                        "4. Action Required - Format:\n"
                        '{\n'
                        '  "category": "Action Required",\n'
                        '  "emailId": "<email_id>",\n'
                        '  "sender": {\n'
                        '      "name": "<sender name>",\n'
                        '      "type": "<Individual/Company>"\n'
                        '  },\n'
                        '  "content": {\n'
                        '    "actionPoints": "<summary of action items>",\n'
                        '    "summary": "<summary of purpose of the actions>"\n'
                        '  }\n'
                        '}\n'
                        "Description: Use this classification when the email includes specific tasks, requests, or instructions that require a response or follow-up. "
                        "Include a list of the action items and a summary of why these actions are needed.\n\n"
                        "5. Receipts - Format:\n"
                        '{\n'
                        '  "category": "Receipts",\n'
                        '  "emailId": "<email_id>",\n'
                        '  "sender": {\n'
                        '      "name": "<sender name>",\n'
                        '      "type": "<Individual/Company>"\n'
                        '  },\n'
                        '  "content": {\n'
                        '    "orderNumber": "<order or receipt number if available>",\n'
                        '    "totalAmount": "<total amount if applicable>",\n'
                        '    "summary": "<receipt details summary>"\n'
                        '  }\n'
                        '}\n'
                        "Description: Use this classification when the email pertains to financial transactions or orders. "
                        "It should include an order or receipt number, the total amount (if applicable), and a brief summary of the transaction details.\n\n"
                        "6. Meeting Update - Format:\n"
                        '{\n'
                        '  "category": "Meeting Update",\n'
                        '  "emailId": "<email_id>",\n'
                        '  "sender": {\n'
                        '      "name": "<sender name>",\n'
                        '      "type": "<Individual/Company>"\n'
                        '  },\n'
                        '  "content": {\n'
                        '    "meetingSubject": "<meeting subject>",\n'
                        '    "oldDateTime": "<old meeting date and time>",\n'
                        '    "oldLocation": "<old meeting location or link>",\n'
                        '    "newDateTime": "<new meeting date and time>",\n'
                        '    "newLocation": "<new meeting location or link>",\n'
                        '    "additionalNotes": "<any additional meeting details>",\n'
                        '    "summary": "<summary of meeting update>"\n'
                        '  }\n'
                        '}\n'
                        "Description: Use this classification when the email communicates changes to a scheduled meeting. "
                        "It should list the previous meeting details (date, time, and location) and the updated meeting details, along with any additional notes.\n\n"
                        "7. None - Format:\n"
                        '{\n'
                        '  "category": "None",\n'
                        '  "emailId": "<email_id>",\n'
                        '  "sender": {\n'
                        '      "name": "<sender name>",\n'
                        '      "type": "<Individual/Company>"\n'
                        '  },\n'
                        '  "content": {\n'
                        '    "summary": "<summary of email information>"\n'
                        '  }\n'
                        '}\n'
                        "Description: Use this classification when the email does not clearly fit into any of the above categories. "
                        "Simply provide a brief summary of the email content.\n\n"
                        "Analyze the following email and return ONLY a valid JSON object in the above format with no explanations or additional text.\n"
                        "Email:\n" + email_context +
                        "\nRETURN ONLY JSON:"
                    )

                    logger.debug("Claude prompt for email %s: %s", email_id, prompt)
                    claude_client = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
                    response = claude_client.messages.create(
                        model="claude-3-5-haiku-20241022",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=500,
                        temperature=0.7,
                    )
                    result_text = response.content[0].text.strip()
                    logger.debug("Claude response for email %s: %s", email_id, result_text)
                    
                    # More robust JSON extraction
                    try:
                        # First, try to find JSON content between backticks
                        if "```json" in result_text or "```" in result_text:
                            # Extract content between backticks
                            start_idx = result_text.find("```")
                            if start_idx != -1:
                                start_idx = result_text.find("\n", start_idx) + 1
                                end_idx = result_text.find("```", start_idx)
                                if end_idx != -1:
                                    result_text = result_text[start_idx:end_idx].strip()
                        
                        # Find JSON object pattern
                        if "{" in result_text and "}" in result_text:
                            json_start = result_text.find("{")
                            json_end = result_text.rfind("}") + 1
                            result_text = result_text[json_start:json_end]
                        
                        classification_result = json.loads(result_text)
                    except Exception as parse_error:
                        logger.error("Failed to parse Claude response for email %s: %s", email_id, parse_error, exc_info=True)
                        classification_result = None

                    # Adjusted parsing: expect a flat object with "emailId" matching the current email.
                    if classification_result and isinstance(classification_result, dict) and classification_result.get("emailId") == email_id:
                        classification = classification_result
                        category = classification.get("category", "")
                        content = classification.get("content", {})
                        sender = classification.get("sender", {}) 
                        if category == "Promotion":
                            promotions.append({
                                "emailId": email_id,
                                "sender": sender, 
                                "content": content
                            })
                            try:
                                tag_email(email_id, add_labels=["Promotion"], service=service)
                            except Exception as tag_err:
                                logger.error("Failed to tag email %s as Promotion: %s", email_id, tag_err)
                            logger.info("Email %s classified as Promotion.", email_id)
                        elif category == "Information":
                            information.append({
                                "emailId": email_id,
                                "sender": sender, 
                                "content": content
                            })
                            try:
                                tag_email(email_id, add_labels=["Information"], service=service)
                            except Exception as tag_err:
                                logger.error("Failed to tag email %s as Information: %s", email_id, tag_err)
                            logger.info("Email %s classified as Information.", email_id)
                        elif category == "Draft":
                            logger.info("Email '%s' classified as Draft.", email_id)
                            if not draft_exists_for_email(service, thread_id):
                                reply_subject = f"Re: {subject}" if not subject.lower().startswith("re:") else subject
                                draft_response = create_draft_email(
                                    to=from_email,
                                    subject=reply_subject,
                                    body=content.get("draftContent", ""),
                                    service=service,
                                    thread_id=thread_id,
                                )
                                gmail_draft_id = draft_response.get("id")
                                drafts.append({
                                    "emailId": email_id,
                                    "sender": sender,
                                    "draft": content,
                                    "gmailDraftId": gmail_draft_id
                                })
                                try:
                                    tag_email(email_id, add_labels=["To Respond"], service=service)
                                except Exception as tag_err:
                                    logger.error("Failed to tag email %s as 'To Respond': %s", email_id, tag_err)
                            else:
                                logger.info("Draft already exists for thread '%s'; skipping draft creation for email '%s'.", thread_id, email_id)
                        elif category == "Action Required":
                            try:
                                tag_email(email_id, add_labels=["Action Required"], service=service)
                            except Exception as tag_err:
                                logger.error("Failed to tag email %s as Action Required: %s", email_id, tag_err)
                            logger.info("Email %s classified as Action Required.", email_id)
                            action_required.append({
                                "emailId": email_id,
                                "sender": sender,
                                "content": content
                            })
                        elif category == "Receipts":
                            try:
                                tag_email(email_id, add_labels=["Receipts"], service=service)
                            except Exception as tag_err:
                                logger.error("Failed to tag email %s as Receipts: %s", email_id, tag_err)
                            logger.info("Email %s classified as Receipts.", email_id)
                            receipts.append({
                                "emailId": email_id,
                                "sender": sender,
                                "content": content
                            })
                        elif category == "Meeting Update":
                            try:
                                tag_email(email_id, add_labels=["Meeting Update"], service=service)
                            except Exception as tag_err:
                                logger.error("Failed to tag email %s as Meeting Update: %s", email_id, tag_err)
                            logger.info("Email %s classified as Meeting Update.", email_id)
                            meeting_updates.append({
                                "emailId": email_id,
                                "sender": sender, 
                                "content": content
                            })
                        elif category == "None":
                            try:
                                tag_email(email_id, add_labels=["Other"], service=service)
                            except Exception as tag_err:
                                logger.error("Failed to tag email %s as Other: %s", email_id, tag_err)
                            logger.info("Email %s classified as None; tagged as Other.", email_id)
                            others.append({
                                "emailId": email_id,
                                "sender": sender, 
                                "content": content
                            })
                        else:
                            logger.info("Email %s classified as unrecognized category: %s", email_id, category)
                        processed_classifications.append({
                            "emailId": email_id,
                            "classification": classification
                        })
                        latest_processed_threads.append(thread_id)
                    else:
                        logger.error("Claude response for email %s does not contain the expected emailId.", email_id)
                        processed_classifications.append({"emailId": email_id, "error": "Invalid classification format"})


                    latest_processed_emails.append(email_id)
                    if len(latest_processed_emails) > 10:
                        latest_processed_emails = latest_processed_emails[-10:]
                    if len(latest_processed_threads) > 10:
                        latest_processed_threads = latest_processed_threads[-10:]
                    processed_emails_count += 1
                    new_emails_count += 1
                except Exception as inner_e:
                    logger.error("Error processing email %s: %s", email_id, inner_e, exc_info=True)
                    continue

        update_data = {
            "promotions": promotions,
            "information": information,
            "drafts": drafts,
            "action_required": action_required,
            "receipts": receipts,
            "meeting_updates": meeting_updates,
            "others": others,
            "latest_processed_emails": latest_processed_emails,
            "latest_processed_threads": latest_processed_threads,
            "processed_emails": processed_emails_count,
            "last_history_id": push_history_id  # Update stored history ID.
        }
        update_resp = supabase.table("users").update(update_data).eq("email", email_address).execute()
        if update_resp.dict().get("error"):
            logger.error("Failed to update user record for %s: %s", email_address, update_resp.dict().get("error"))
        else:
            logger.info("User record updated for %s", email_address)

    logger.info("Notification processed. %d new emails processed.", new_emails_count)
    return jsonify({
        "status": "Notification processed",
        "new_emails_count": new_emails_count,
        "processed": processed_classifications
    }), 200



@emails_bp.route("/simulate_notification", methods=["POST"])
def simulate_notification():
    data = request.get_json()
    logger.info("Simulated notification received: %s", data)
    return jsonify({"status": "notification logged"}), 200

@emails_bp.route('/stop_watch', methods=['POST'])
def stop_watch_emails():
    logger.info("POST /api/emails/stop_watch called")
    try:
        service = _get_gmail_service()
        response = service.users().stop(userId='me').execute()
        logger.info("Watch stopped.")
        return jsonify(response)
    except Exception as e:
        logger.error("Error in stop_watch_emails: %s", e, exc_info=True)
        return jsonify({'error': str(e)}), 400

@emails_bp.route("/quick_remove", methods=["POST"])
def quick_remove():
    """
    Endpoint to quickly remove a draft, info, or promotion from the user's record.
    If removing a draft, it will also delete the Gmail draft.
    Expects a JSON payload with:
      - type: "draft", "info", or "promotion"
      - emailId: the email identifier of the item
      - (for drafts only) gmailDraftId: the Gmail draft ID to delete
    """
    data = request.get_json()
    removal_type = data.get("type")
    email_id = data.get("emailId")
    if not removal_type or not email_id:
        return jsonify({"error": "Missing required parameters"}), 400

    session_id = request.cookies.get("session_id")
    if not session_id:
        return jsonify({"error": "No session id provided"}), 400

    user = get_user_by_session(session_id)
    if not user:
        return jsonify({"error": "User not found"}), 400

    user_email = user.get("email")
    # Retrieve the user's record from Supabase
    user_record = supabase.table("users").select("*").eq("email", user_email).single().execute()
    if not user_record.data:
        return jsonify({"error": "User record not found"}), 400

    user_data = user_record.data
    updated_field = {}

    if removal_type == "draft":
        gmail_draft_id = data.get("gmailDraftId")
        if gmail_draft_id:
            try:
                # Delete the Gmail draft using the helper function from gmail_service.
                from services.gmail_service import delete_draft
                delete_draft(gmail_draft_id)
            except Exception as e:
                logger.error("Error deleting Gmail draft: %s", e)
        # Remove the draft from the user's drafts array.
        drafts = user_data.get("drafts") or []
        drafts = [d for d in drafts if d.get("emailId") != email_id]
        updated_field["drafts"] = drafts

    elif removal_type == "info":
        info = user_data.get("information") or []
        info = [i for i in info if i.get("emailId") != email_id]
        updated_field["information"] = info

    elif removal_type == "promotion":
        promotions = user_data.get("promotions") or []
        promotions = [p for p in promotions if p.get("emailId") != email_id]
        updated_field["promotions"] = promotions

    else:
        return jsonify({"error": "Invalid removal type"}), 400

    update_resp = supabase.table("users").update(updated_field).eq("email", user_email).execute()
    if update_resp.dict().get("error"):
        return jsonify({"error": "Failed to update user record"}), 500

    return jsonify({"status": "success"}), 200

def parse_expiration(expiration_str):
    """
    Attempt to parse an expiration string into a datetime object.
    Returns the datetime if parsed successfully; otherwise returns None.
    """
    if not expiration_str:
        return None

    exp_clean = expiration_str.strip().lower()
    # Define a set of values considered invalid or ambiguous.
    invalid_values = {"n/a", "not specified", "today", "tonight"}
    if exp_clean in invalid_values:
        return None

    # Try parsing "mm/dd/yyyy" format.
    if "/" in expiration_str:
        parts = expiration_str.split('/')
        if len(parts) == 3:
            try:
                month, day, year = map(int, parts)
                return datetime.datetime(year, month, day)
            except Exception:
                pass  # If conversion fails, try the next format.

    # Try parsing formats like "Apr 7, 2025" or "April 7, 2025".
    for fmt in ("%b %d, %Y", "%B %d, %Y"):
        try:
            return datetime.datetime.strptime(expiration_str, fmt)
        except Exception:
            continue

    # Add further parsing logic as required by your application's needs.
    return None

def clean_promotional_emails(user_email, promotions_list):
    """
    Cleans the promotional emails by removing any that:
      - Have no valid expiration date (e.g., "N/A", "Not specified", "Today", "Tonight")
      - Or have an expiration date in the past.
    Updates the user's promotions list in Supabase accordingly.
    """
    logger.info("Running clean_promotional_emails for user %s", user_email)
    cleaned_promotions = []
    current_date = datetime.datetime.now()

    for promo in promotions_list:
        expiration = promo.get("content", {}).get("expiration")
        parsed_date = parse_expiration(expiration)
        if parsed_date is None:
            # Remove promotions without a valid expiration date.
            logger.info("Promotion removed due to invalid expiration (%s): %s", expiration, promo)
        else:
            if parsed_date >= current_date:
                cleaned_promotions.append(promo)
            else:
                logger.info("Promotion expired and removed: %s", promo)

    # Update the promotions list in the user's record.
    update_resp = supabase.table("users").update({"promotions": cleaned_promotions}).eq("email", user_email).execute()
    if update_resp.dict().get("error"):
        logger.error("Failed to update promotions for user %s: %s", user_email, update_resp.dict().get("error"))
        return {"status": "error", "message": update_resp.dict().get("error")}
    logger.info("Promotions updated for user %s after cleaning", user_email)
    return {"status": "Cleaned promotional emails", "cleaned_count": len(cleaned_promotions)}

@emails_bp.route("/read_all", methods=["POST"])
def read_all_emails():
    """
    Endpoint to mark all emails of a given category as read.
    For this example, we simulate marking as read by clearing the emails of that type from the user record.
    Expects a JSON payload with:
      - type: one of "draft", "info", "promotion", "action_required", "receipts", "meeting_updates", "other"
    """
    data = request.get_json()
    email_type = data.get("type")
    if not email_type:
        return jsonify({"error": "Email type not provided"}), 400

    session_id = request.cookies.get("session_id")
    if not session_id:
        return jsonify({"error": "No session id provided"}), 400

    user = get_user_by_session(session_id)
    if not user:
        return jsonify({"error": "User not found"}), 400

    user_email = user.get("email")
    user_record = supabase.table("users").select("*").eq("email", user_email).single().execute()
    if not user_record.data:
        return jsonify({"error": "User record not found"}), 400

    updated_field = {}
    # Map the email type to the corresponding field in the user record
    if email_type == "draft":
        updated_field["drafts"] = []
    elif email_type == "info":
        updated_field["information"] = []
    elif email_type == "promotion":
        updated_field["promotions"] = []
    elif email_type == "action_required":
        updated_field["action_required"] = []
    elif email_type == "receipts":
        updated_field["receipts"] = []
    elif email_type == "meeting_updates":
        updated_field["meeting_updates"] = []
    elif email_type == "other":
        updated_field["others"] = []
    else:
        return jsonify({"error": "Invalid email type"}), 400

    update_resp = supabase.table("users").update(updated_field).eq("email", user_email).execute()
    if update_resp.dict().get("error"):
        return jsonify({"error": "Failed to update user record"}), 500

    return jsonify({"status": "success", "cleared": email_type}), 200