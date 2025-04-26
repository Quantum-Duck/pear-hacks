# services/ai_service.py
import json
import logging
import os
import anthropic  # Import the Anthropic library

from services.gmail_service import send_email, create_draft_email
# Import calendar functions so that calendar instructions can be executed.
from services.calendar_service import create_event, update_event, delete_event

logger = logging.getLogger(__name__)

def process_email_request(instruction_details):
    """Helper function to process email requests from JSON instructions."""
    if "function" not in instruction_details or "parameters" not in instruction_details:
        logger.error("Missing function or parameters in extracted JSON.")
        return "Missing function or parameters in extracted details."

    function_call = instruction_details.get("function")
    parameters = instruction_details.get("parameters")
    logger.info("Processing email request: %s with parameters: %s", function_call, parameters)

    if function_call not in ["send_email", "draft_email"]:
        return f"Unsupported function: {function_call}"

    required_email_keys = ["to", "subject", "body"]
    if not all(key in parameters for key in required_email_keys):
        logger.error("Missing required parameters in email details: %s", parameters)
        return "Missing required email parameters. Required parameters: to, subject, body."
    
    try:
        if function_call == "send_email":
            result = send_email(
                parameters["to"],
                parameters["subject"],
                parameters["body"],
                parameters.get("cc")
            )
            email_id = result.get('id', 'N/A')
            logger.info("Email sent successfully with ID: %s", email_id)
            return f"Email sent successfully to {parameters['to']}. Email ID: {email_id}"
        elif function_call == "draft_email":
            result = create_draft_email(
                parameters["to"],
                parameters["subject"],
                parameters["body"],
                parameters.get("cc")
            )
            draft_id = result.get('id', 'N/A')
            logger.info("Draft email created successfully with ID: %s", draft_id)
            return f"Draft email created successfully to {parameters['to']}. Draft ID: {draft_id}"
    except Exception as e:
        logger.error("Error processing email request: %s", e)
        return f"Error processing email request: {str(e)}"

# Initialize the Anthropic client using the API key
try:
    # Initialize with error handling
    api_key = os.getenv("CLAUDE_API_KEY")
    if not api_key:
        logger.error("CLAUDE_API_KEY environment variable not found")
        raise ValueError("Missing CLAUDE_API_KEY")
        
    anthropic_client = anthropic.Anthropic(api_key=api_key)
    logger.info("Initialized anthropic client successfully")
except Exception as e:
    logger.error(f"Failed to initialize anthropic client: {str(e)}")
    # Try older API as fallback
    try:
        anthropic_client = anthropic.Client(api_key=os.getenv("CLAUDE_API_KEY"))
        logger.info("Initialized anthropic client using legacy API")
    except Exception as e2:
        logger.error(f"Failed to initialize anthropic client with legacy API: {str(e2)}")
        raise

def process_chat(prompt):
    """
    Processes the chat prompt using Claude. This function handles
    both email instructions and calendar event operations (create, update, delete).
    
    It sends an extraction prompt to Claude asking it to check if the user wants to:
      - send or draft an email, OR
      - create, update, or delete a calendar event.
    
    Expected JSON output (if any instruction is detected) must follow one of these structures:
    
    For email instructions:
      {
        "function": "send_email" or "draft_email",
        "parameters": {
          "to": "recipient email address",
          "subject": "email subject",
          "body": "email body content",
          "cc": "optional, comma separated email addresses"
        }
      }
    
    For calendar event instructions:
      {
        "function": "create_event" or "update_event" or "delete_event",
        "parameters": {
          For create_event:
            "summary": "event summary",
            "start_time": "start datetime in ISO format",
            "end_time": "end datetime in ISO format",
            "location": "optional",
            "description": "optional",
            "attendees": "optional, comma separated emails"
          For update_event:
            "event_id": "ID of the event to update",
            and any of the fields: "summary", "start_time", "end_time", "location", "description", "attendees" that need to be updated.
          For delete_event:
            "event_id": "ID of the event to delete"
        }
      }
    
    If the prompt does not match any of the above, output exactly: NONE
    """
    extraction_prompt = (
        "You are an AI assistant integrated into a productivity app that can follow specific instructions from users. "
        "You have authorization to send real emails and manage calendar events when requested. "
        "IMPORTANT: You should NEVER refuse to send emails because 'AI cannot send emails'. This system is specifically authorized to send emails on behalf of the user.\n\n"
        
        "If the prompt instructs or requests to send or draft an email (including any phrasing like 'send an email', 'write to', 'email as', etc.), output a valid JSON object with the following structure:\n"
        "{\n"
        '  "function": "send_email" or "draft_email",\n'
        '  "parameters": {\n'
        '    "to": "recipient email address",\n'
        '    "subject": "email subject",\n'
        '    "body": "email body content",\n'
        '    "cc": "optional, comma separated email addresses"\n'
        "  }\n"
        "}\n"
        
        "If the user asks you to impersonate someone or write in a specific style, you SHOULD fulfill this request by creating an appropriate email. "
        "When the user asks you to 'write as X' or 'write like X', this is a legitimate use case for our application.\n\n"
        
        "If the prompt instructs to create, update, or delete a calendar event, output a valid JSON object with the following structure:\n"
        "{\n"
        '  "function": "create_event" or "update_event" or "delete_event",\n'
        '  "parameters": {\n'
        '    For create_event: "summary": "event summary", "start_time": "start datetime in ISO format", "end_time": "end datetime in ISO format", "location": "optional", "description": "optional", "attendees": "optional, comma separated emails".\n'
        '    For update_event: "event_id": "ID of the event to update", and any of the fields: "summary", "start_time", "end_time", "location", "description", "attendees".\n'
        '    For delete_event: "event_id": "ID of the event to delete".\n'
        "  }\n"
        "}\n"
        
        "If the prompt does not explicitly request to send an email or manage a calendar event, output exactly: NONE\n"
        f"Instruction: {prompt}"
    )

    logger.info("Sending extraction prompt to Claude: %s", extraction_prompt)

    try:
        # Using Claude-3.5 Haiku (latest cheaper model)
        try:
            # Try newer Anthropic API
            extraction_response = anthropic_client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1000,  # Increased from 200 to 1000 to avoid truncation
                temperature=0,
                messages=[
                    {"role": "user", "content": extraction_prompt}
                ]
            )
            extraction_text = extraction_response.content[0].text
        except (AttributeError, TypeError):
            # Fall back to older Anthropic API
            extraction_response = anthropic_client.completion(
                prompt=f"\n\nHuman: {extraction_prompt}\n\nAssistant:",
                model="claude-3-5-haiku-20241022",
                max_tokens_to_sample=1000,
                temperature=0
            )
            extraction_text = extraction_response.completion
        logger.info("Extraction response from Claude: %s", extraction_response)
        logger.info("Extracted text: %s", extraction_text)
    except Exception as e:
        logger.error("Error during extraction: %s", e)
        extraction_text = "NONE"

    # If no instruction was detected for email or calendar, fallback to normal chat completion.
    if extraction_text.upper() == "NONE":
        logger.info("No specific instruction detected. Falling back to standard chat response.")
        try:
            # Update the chat system prompt to better handle email-related requests
            system_message = """You are an AI assistant in a productivity app that can help users with various tasks including sending emails and managing calendar events.

If the user asks about sending emails or writing in someone's style, DO NOT say you can't send emails or impersonate people. Instead, offer to help draft the email content they want, and let them know they can use our app's email sending feature.

For example, if someone asks "write an email as Barack Obama", don't refuse - instead provide helpful email content in Obama's style and mention they can send it through our app.

Keep your responses helpful, professional, and focused on assisting the user with their productivity needs."""
            
            try:
                # Try newer Anthropic API
                chat_response = anthropic_client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=1000,
                    temperature=0.7,
                    system=system_message,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                answer = chat_response.content[0].text
            except (AttributeError, TypeError):
                # Fall back to older Anthropic API
                chat_response = anthropic_client.completion(
                    prompt=f"\n\nHuman: {prompt}\n\nAssistant:",
                    model="claude-3-5-haiku-20241022",
                    max_tokens_to_sample=1000,
                    temperature=0.7
                )
                answer = chat_response.completion
            logger.info("Chat response from Claude: %s", chat_response)
            return answer
        except Exception as e:
            logger.error("Error during chat completion: %s", e)
            return f"Error during chat response: {str(e)}"

    # Attempt to parse the Claude extraction response as JSON.
    try:
        # Handle potential truncated JSON by checking for a complete JSON structure
        if extraction_text.count('{') != extraction_text.count('}'):
            logger.warning("Potentially truncated JSON detected. Falling back to standard chat.")
            # Fall back to standard chat completion for this request
            try:
                # Try newer Anthropic API
                chat_response = anthropic_client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=1000,
                    temperature=0.7,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                return chat_response.content[0].text
            except (AttributeError, TypeError):
                # Fall back to older Anthropic API
                chat_response = anthropic_client.completion(
                    prompt=f"\n\nHuman: {prompt}\n\nAssistant:",
                    model="claude-3-5-haiku-20241022",
                    max_tokens_to_sample=1000,
                    temperature=0.7
                )
                return chat_response.completion
            
        instruction_details = json.loads(extraction_text)
        logger.info("Parsed instruction details: %s", instruction_details)
    except json.JSONDecodeError as je:
        logger.error("Error parsing JSON: %s", je)
        # Check if this might be an email request based on content
        email_keywords = ["email", "message", "send", "write", "draft", "compose"]
        email_related = any(keyword in prompt.lower() for keyword in email_keywords)
        
        # If this looks like an email request, try one more time with a more explicit prompt
        if email_related:
            logger.warning("JSON parsing failed but detected potential email request, trying again")
            retry_prompt = (
                "You are an email assistant that helps users send emails. "
                "The user has requested to send or draft an email. Extract the email details and output ONLY a valid JSON object "
                "with the following structure:\n"
                "{\n"
                '  "function": "send_email",\n'
                '  "parameters": {\n'
                '    "to": "<recipient email address>",\n'
                '    "subject": "<email subject>",\n'
                '    "body": "<email body content>",\n'
                '    "cc": "<optional comma separated email addresses>"\n'
                "  }\n"
                "}\n\n"
                f"User request: {prompt}\n\n"
                "Output ONLY the JSON object, nothing else:"
            )
            
            try:
                try:
                    # Try newer Anthropic API
                    retry_response = anthropic_client.messages.create(
                        model="claude-3-5-haiku-20241022",
                        max_tokens=1500,  # Increased token limit
                        temperature=0,    # Lower temperature for more deterministic output
                        messages=[
                            {"role": "user", "content": retry_prompt}
                        ]
                    )
                    retry_text = retry_response.content[0].text.strip()
                except (AttributeError, TypeError):
                    # Fall back to older Anthropic API
                    retry_response = anthropic_client.completion(
                        prompt=f"\n\nHuman: {retry_prompt}\n\nAssistant:",
                        model="claude-3-5-haiku-20241022",
                        max_tokens_to_sample=1500,
                        temperature=0
                    )
                    retry_text = retry_response.completion.strip()
                # Try to extract JSON even if surrounded by other text
                if '{' in retry_text and '}' in retry_text:
                    start_idx = retry_text.find('{')
                    end_idx = retry_text.rfind('}') + 1
                    json_str = retry_text[start_idx:end_idx]
                    instruction_details = json.loads(json_str)
                    logger.info("Successfully parsed email JSON on retry: %s", instruction_details)
                    return process_email_request(instruction_details)
            except Exception as retry_err:
                logger.error("Retry attempt also failed: %s", retry_err)
        
        # Fall back to standard chat completion
        logger.warning("Falling back to standard chat due to JSON parsing error")
        system_message = """You are an AI assistant in a productivity app that can help users with various tasks including sending emails.
        
When users ask you to write or send emails, help them compose the content without refusing."""
        
        try:
            # Try newer Anthropic API
            chat_response = anthropic_client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1000,
                temperature=0.7,
                system=system_message,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return chat_response.content[0].text
        except (AttributeError, TypeError):
            # Fall back to older Anthropic API
            chat_response = anthropic_client.completion(
                prompt=f"\n\nHuman: {prompt}\n\nAssistant:",
                model="claude-3-5-haiku-20241022",
                max_tokens_to_sample=1000,
                temperature=0.7
            )
            return chat_response.completion
    except Exception as e:
        logger.error("Unexpected error parsing instruction: %s", e)
        return "I encountered an unexpected error. Please try again or rephrase your request."

    # Validate that the required keys exist.
    if "function" not in instruction_details or "parameters" not in instruction_details:
        logger.error("Missing function or parameters in extracted JSON.")
        return "Missing function or parameters in extracted details."

    function_call = instruction_details.get("function")
    parameters = instruction_details.get("parameters")
    logger.info("Function call: %s with parameters: %s", function_call, parameters)

    # ---------------------------
    # Handle Email Instructions
    # ---------------------------
    if function_call in ["send_email", "draft_email"]:
        return process_email_request(instruction_details)

    # ------------------------------------
    # Handle Calendar Event Instructions
    # ------------------------------------
    elif function_call in ["create_event", "update_event", "delete_event"]:
        if function_call == "create_event":
            required_keys = ["summary", "start_time", "end_time"]
            if not all(key in parameters for key in required_keys):
                logger.error("Missing required parameters for creating event: %s", parameters)
                return "Missing required calendar event parameters for creating an event (summary, start_time, end_time)."
            summary = parameters.get("summary")
            start_time = parameters.get("start_time")
            end_time = parameters.get("end_time")
            location = parameters.get("location")
            description = parameters.get("description")
            attendees = None
            if "attendees" in parameters and parameters["attendees"]:
                # Split comma-separated attendees into a list
                attendees = [email.strip() for email in parameters["attendees"].split(",") if email.strip()]
            try:
                result = create_event(summary, start_time, end_time, location, description, attendees)
                event_id = result.get('id', 'N/A')
                logger.info("Event created successfully with ID: %s", event_id)
                return f"Event created successfully with ID: {event_id}"
            except Exception as e:
                logger.error("Error creating event: %s", e)
                return f"Error creating event: {str(e)}"

        elif function_call == "update_event":
            event_id = parameters.get("event_id")
            if not event_id:
                logger.error("Missing event_id for updating event.")
                return "Missing event_id for updating the event."
            summary = parameters.get("summary")
            start_time = parameters.get("start_time")
            end_time = parameters.get("end_time")
            location = parameters.get("location")
            description = parameters.get("description")
            attendees = None
            if "attendees" in parameters and parameters["attendees"]:
                attendees = [email.strip() for email in parameters["attendees"].split(",") if email.strip()]
            try:
                result = update_event(event_id, summary, start_time, end_time, location, description, attendees)
                updated_id = result.get('id', 'N/A')
                logger.info("Event updated successfully with ID: %s", updated_id)
                return f"Event updated successfully with ID: {updated_id}"
            except Exception as e:
                logger.error("Error updating event: %s", e)
                return f"Error updating event: {str(e)}"

        elif function_call == "delete_event":
            event_id = parameters.get("event_id")
            if not event_id:
                logger.error("Missing event_id for deleting event.")
                return "Missing event_id for deleting the event."
            try:
                result = delete_event(event_id)
                status = result.get("status", "unknown")
                logger.info("Event deleted successfully. Status: %s", status)
                return f"Event deleted successfully. Status: {status}"
            except Exception as e:
                logger.error("Error deleting event: %s", e)
                return f"Error deleting event: {str(e)}"

    else:
        logger.error("Unknown function specified in instructions: %s", function_call)
        return "Unknown function specified in instructions."