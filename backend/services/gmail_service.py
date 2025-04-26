# services/gmail_service.py
import base64
import os
import googleapiclient.discovery
from google.oauth2.credentials import Credentials
from flask import request
from utils.supabae_utils import get_token_from_supabase  # fetch token from Supabase
from google.auth.exceptions import RefreshError
from googleapiclient.errors import HttpError
from supabase_client import supabase  # your Supabase client
import logging

logger = logging.getLogger(__name__)

def _get_gmail_service():
    token = get_token_from_supabase()
    if not token:
        raise Exception("User not authenticated")
    creds = Credentials(
        token=token.get('access_token'),
        refresh_token=token.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.getenv("CLIENT_ID"),
        client_secret=os.getenv("CLIENT_SECRET"),
        scopes=token.get('scope').split() if token.get('scope') else None,
        id_token=token.get('id_token')
    )
    try:
        service = googleapiclient.discovery.build('gmail', 'v1', credentials=creds)
        return service
    except RefreshError as e:
        # If refresh fails, clear the token in Supabase so that the user is forced to reauthenticate.
        session_id = request.cookies.get("session_id")
        if session_id:
            supabase.table("users").update({"token": {}}).eq("session_id", session_id).execute()
        raise Exception("Authentication failed: invalid credentials. Please reauthenticate.") from e

def list_emails(max_results=20, page_token=None, label_ids=None):
    service = _get_gmail_service()
    params = {
        'userId': 'me',
        'maxResults': max_results
    }
    if page_token:
        params['pageToken'] = page_token
    if label_ids:
        params['labelIds'] = label_ids
    results = service.users().messages().list(**params).execute()
    messages = results.get('messages', [])
    next_page_token = results.get('nextPageToken')
    emails = []
    for msg in messages:
        # Retrieve full message details including headers and internalDate.
        msg_detail = service.users().messages().get(
            userId='me', id=msg['id'], format='full'
        ).execute()
        email_data = {
            'id': msg_detail.get('id'),
            'snippet': msg_detail.get('snippet'),
            'payload': msg_detail.get('payload'),
            'internalDate': msg_detail.get('internalDate'),
            'labelIds': msg_detail.get('labelIds', [])
        }
        emails.append(email_data)
    return emails, next_page_token

def get_email_by_id(msg_id):
    service = _get_gmail_service()
    msg_detail = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
    return msg_detail

def send_email(to, subject, body, cc=None):
    service = _get_gmail_service()
    from email.mime.text import MIMEText
    mime_message = MIMEText(body)
    mime_message['to'] = to
    mime_message['subject'] = subject
    if cc:
        mime_message['cc'] = cc if isinstance(cc, str) else ", ".join(cc)
    raw_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode('utf-8')
    message = {'raw': raw_message}
    sent_message = service.users().messages().send(userId='me', body=message).execute()
    return sent_message

def create_draft_email(to, subject, body, cc=None, service=None, thread_id=None):
    if service is None:
        service = _get_gmail_service()
    from email.mime.text import MIMEText
    mime_message = MIMEText(body)
    mime_message['to'] = to
    mime_message['subject'] = subject
    if cc:
        mime_message['cc'] = cc if isinstance(cc, str) else ", ".join(cc)
    # If replying, include headers that indicate a reply.
    if thread_id:
        # Note: These headers typically require the parent email’s Message-ID.
        # For simplicity, we use the thread ID here.
        mime_message['In-Reply-To'] = thread_id
        mime_message['References'] = thread_id
    raw_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode('utf-8')
    # Build the message body and include threadId if provided.
    message_body = {'raw': raw_message}
    if thread_id:
        message_body['threadId'] = thread_id
    draft = service.users().drafts().create(
        userId='me',
        body={'message': message_body}
    ).execute()
    return draft

def create_label_if_not_exists(label_name, service):
    """
    Check if a label with the given name exists; if not, create it with a unique color
    based on the label name and return its ID.
    """
    # List existing labels
    existing = service.users().labels().list(userId="me").execute()
    labels = existing.get("labels", [])
    for label in labels:
        if label.get("name") == label_name:
            return label.get("id")
    
    # Determine colors based on label type.
    if label_name == "Promotion":
        background_color = "#3c78d8"  # Allowed blue
        text_color = "#ffffff"
    elif label_name == "Information":
        background_color = "#16a766"  # Allowed green
        text_color = "#ffffff"
    elif label_name == "To Respond":
        background_color = "#fb4c2f"  # Allowed red
        text_color = "#ffffff"
    elif label_name == "Action Required":
        background_color = "#ffad47"  # bright orange from palette
        text_color = "#ffffff"
    elif label_name == "Receipts":
        background_color = "#d5ae49"  # golden tone for receipts
        text_color = "#ffffff"
    elif label_name == "Meeting Update":
        background_color = "#a4c2f4"  # light blue for meeting updates
        text_color = "#ffffff"
    elif label_name == "Other":
        background_color = "#666666"  # grey for emails with no tags
        text_color = "#ffffff"
    else:
        # Default colors if label is not one of the specified ones.
        background_color = "#3c78d8"
        text_color = "#ffffff"
    
    label_body = {
        "name": label_name,
        "labelListVisibility": "labelShow",
        "messageListVisibility": "show",
        "color": {
            "backgroundColor": background_color,
            "textColor": text_color
        }
    }
    new_label = service.users().labels().create(userId="me", body=label_body).execute()
    logger.info("Created new label '%s' with ID %s and color %s", label_name, new_label.get("id"), background_color)
    return new_label.get("id")

def tag_email(msg_id, add_labels=[], remove_labels=[], service=None):
    """
    Modify the Gmail message with the given labels. If an add_label does not exist,
    it will be created.
    """
    if service is None:
        service = _get_gmail_service()
    # First, assume the labels in add_labels might be names. We need to convert them to valid label IDs.
    valid_add_label_ids = []
    for label in add_labels:
        # Try to create (or fetch) the label. If it exists, its ID is returned.
        try:
            label_id = create_label_if_not_exists(label, service)
            valid_add_label_ids.append(label_id)
        except Exception as create_err:
            logger.error("Failed to create or retrieve label '%s': %s", label, create_err)
    # For removal, you might already have valid label IDs or you can do a similar conversion.
    body = {
        'addLabelIds': valid_add_label_ids,
        'removeLabelIds': remove_labels
    }
    try:
        modified_message = service.users().messages().modify(userId='me', id=msg_id, body=body).execute()
        return modified_message
    except HttpError as e:
        logger.error("Failed to tag message %s: %s", msg_id, e)
        raise

def analyze_user_emails(max_results=100):
    from datetime import datetime, timedelta
    service = _get_gmail_service()
    five_years_ago = datetime.now() - timedelta(days=5*365)
    query = f"after:{five_years_ago.strftime('%Y/%m/%d')}"
    results = service.users().messages().list(userId='me', labelIds=['SENT'], q=query, maxResults=max_results).execute()
    messages = results.get('messages', [])
    emails = []
    for msg in messages:
        msg_detail = service.users().messages().get(userId='me', id=msg['id']).execute()
        emails.append(msg_detail)
    return emails

def delete_draft(draft_id, service=None):
    """
    Delete a Gmail draft given its draft ID.
    """
    if service is None:
        service = _get_gmail_service()
    return service.users().drafts().delete(userId='me', id=draft_id).execute()
