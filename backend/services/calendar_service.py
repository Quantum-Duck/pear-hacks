# services/calendar_service.py
import os
import logging
import re
from datetime import datetime, timedelta, timezone
import googleapiclient.discovery
from google.oauth2.credentials import Credentials
from flask import request
from utils.supabae_utils import get_token_from_supabase  # fetch token from Supabase
from google.auth.exceptions import RefreshError
from supabase_client import supabase  # your Supabase client
from dateutil.parser import parse

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Regular expression for basic email validation.
EMAIL_REGEX = re.compile(r"[^@]+@[^@]+\.[^@]+")

# ----------------------------------------------------------------------------
# Helper Functions for Date/Time Conversion
# ----------------------------------------------------------------------------
def preprocess_datetime_str(date_str):
    """
    Replace common relative date expressions (e.g., "tomorrow")
    with an absolute date string based on the current date.
    """
    if "tomorrow" in date_str.lower():
        tomorrow = datetime.now() + timedelta(days=1)
        # Replace "tomorrow" with the actual date (e.g., "2025-04-13")
        date_str = date_str.lower().replace("tomorrow", tomorrow.strftime("%Y-%m-%d"))
    return date_str

def convert_to_iso_datetime(date_str):
    """
    Converts a date/time string (which may include relative expressions)
    into a timezone-aware datetime object in UTC.
    """
    date_str = preprocess_datetime_str(date_str)
    try:
        dt = parse(date_str)
        # If no timezone is provided, assume UTC.
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as e:
        raise Exception(f"Invalid date/time format: '{date_str}'. Error: {e}")

# ----------------------------------------------------------------------------
# Google Calendar Service Functions
# ----------------------------------------------------------------------------
def _get_calendar_service():
    """
    Retrieve token data from Supabase (via the session_id cookie)
    and returns a Google Calendar API service instance.
    """
    logger.debug("Entering _get_calendar_service()")
    token = get_token_from_supabase()
    if not token:
        logger.error("No token found: user is not authenticated.")
        raise Exception("User not authenticated")
    try:
        logger.debug("Found token. Building credentials object...")
        creds = Credentials(
            token=token.get('access_token'),
            refresh_token=token.get('refresh_token'),
            token_uri='https://oauth2.googleapis.com/token',
            client_id=os.getenv("CLIENT_ID"),
            client_secret=os.getenv("CLIENT_SECRET"),
            scopes=token.get('scope').split() if token.get('scope') else None,
            id_token=token.get('id_token')
        )
        logger.debug("Credentials object built. Building Calendar service...")
        service = googleapiclient.discovery.build('calendar', 'v3', credentials=creds)
        logger.info("Calendar service built successfully.")
        return service
    except RefreshError as e:
        session_id = request.cookies.get("session_id")
        if session_id:
            supabase.table("users").update({"token": {}}).eq("session_id", session_id).execute()
        raise Exception("Authentication failed: invalid credentials. Please reauthenticate.") from e
    except Exception as e:
        logger.exception("Failed to build Google Calendar service.")
        raise

def list_events(max_results=10, show_all_future=False, time_min=None, time_max=None):
    logger.debug(
        "Entering list_events() with max_results=%s, show_all_future=%s, time_min=%s, time_max=%s", 
        max_results, show_all_future, time_min, time_max
    )
    service = _get_calendar_service()

    params = {
        'calendarId': 'primary',
        'maxResults': max_results,
        'singleEvents': True,
        'orderBy': 'startTime'
    }
    if time_min:
        params['timeMin'] = time_min
    elif show_all_future:
        now = datetime.utcnow().isoformat() + 'Z'
        params['timeMin'] = now

    if time_max:
        params['timeMax'] = time_max

    try:
        logger.debug("Calling service.events().list with params=%s", params)
        events_result = service.events().list(**params).execute()
        events = events_result.get('items', [])
        logger.debug("Received %d events from the Calendar API.", len(events))
        
        # Fallback: if no events and debugging is enabled, try querying without time filtering.
        if not events:
            logger.warning("No events found in the specified time range. Querying without time filters.")
            fallback_params = {
                'calendarId': 'primary',
                'maxResults': max_results,
                'singleEvents': True,
                'orderBy': 'startTime'
            }
            fallback_result = service.events().list(**fallback_params).execute()
            fallback_events = fallback_result.get('items', [])
            logger.debug("Fallback query returned %d events.", len(fallback_events))
        
        return events
    except Exception as e:
        logger.exception("Error listing calendar events.")
        raise

def create_event(summary, start_time, end_time, location=None, description=None, attendees=None):
    logger.debug("Entering create_event() with summary=%s, start_time=%s, end_time=%s", summary, start_time, end_time)
    service = _get_calendar_service()

    # Convert start_time and end_time to proper ISO datetime strings.
    try:
        dt_start = convert_to_iso_datetime(start_time)
    except Exception as e:
        raise Exception(f"Invalid start_time: {e}")

    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    if dt_start < now:
        logger.warning("Computed start time %s is in the past relative to current time %s", dt_start.isoformat(), now.isoformat())
        # Optionally, you may adjust dt_start to tomorrow if the original prompt said "tomorrow"
        # or return an error indicating the event time is in the past.
        # For this example, we'll return an error.
        raise Exception("The event start time is in the past. Please specify a future time.")

    # If end_time is missing, default to one hour after start_time.
    if not end_time:
        dt_end = dt_start + timedelta(hours=1)
    else:
        try:
            dt_end = convert_to_iso_datetime(end_time)
        except Exception as e:
            raise Exception(f"Invalid end_time: {e}")

    start_obj = {'dateTime': dt_start.isoformat(), 'timeZone': 'UTC'}
    end_obj = {'dateTime': dt_end.isoformat(), 'timeZone': 'UTC'}

    event_body = {
        'summary': summary,
        'start': start_obj,
        'end': end_obj,
    }
    if location:
        event_body['location'] = location
    if description:
        event_body['description'] = description

    # Validate attendee emails.
    if attendees:
        valid_attendees = []
        for email in attendees:
            email = email.strip()
            if email and EMAIL_REGEX.match(email):
                valid_attendees.append(email)
            else:
                logger.warning("Skipping invalid attendee email: %s", email)
        if valid_attendees:
            event_body['attendees'] = [{'email': email} for email in valid_attendees]

    logger.debug("Event body constructed: %s", event_body)

    try:
        new_event = service.events().insert(calendarId='primary', body=event_body).execute()
        logger.info("Event created successfully with id=%s", new_event.get('id'))
        logger.debug("Created event details: %s", new_event)
        return new_event
    except Exception as e:
        logger.exception("Error creating calendar event.")
        raise Exception(f"Error creating event: {e}")


def update_event(event_id, summary=None, start_time=None, end_time=None,
                 location=None, description=None, attendees=None):
    logger.debug("Entering update_event() for event_id=%s", event_id)
    service = _get_calendar_service()

    try:
        logger.debug("Fetching existing event with ID=%s", event_id)
        event = service.events().get(calendarId='primary', eventId=event_id).execute()
        logger.debug("Existing event fetched: %s", event)

        if summary is not None:
            event['summary'] = summary
        if start_time is not None:
            try:
                dt_start = convert_to_iso_datetime(start_time)
                event['start'] = {'dateTime': dt_start.isoformat(), 'timeZone': 'UTC'}
            except Exception as e:
                raise Exception(f"Invalid start_time format for update: {e}")
        if end_time is not None:
            try:
                dt_end = convert_to_iso_datetime(end_time)
                event['end'] = {'dateTime': dt_end.isoformat(), 'timeZone': 'UTC'}
            except Exception as e:
                raise Exception(f"Invalid end_time format for update: {e}")
        if location is not None:
            event['location'] = location
        if description is not None:
            event['description'] = description
        if attendees is not None:
            valid_attendees = []
            for email in attendees:
                email = email.strip()
                if email and EMAIL_REGEX.match(email):
                    valid_attendees.append(email)
                else:
                    logger.warning("Skipping invalid attendee email: %s", email)
            if valid_attendees:
                event['attendees'] = [{'email': email} for email in valid_attendees]

        logger.debug("Updated event data: %s", event)
        updated_event = service.events().update(calendarId='primary', eventId=event_id, body=event).execute()
        logger.info("Event with ID=%s updated successfully.", event_id)
        logger.debug("Updated event details: %s", updated_event)
        return updated_event
    except Exception as e:
        logger.exception("Error updating calendar event with ID=%s", event_id)
        raise Exception(f"Error updating event: {e}")

def delete_event(event_id):
    logger.debug("Entering delete_event() for event_id=%s", event_id)
    service = _get_calendar_service()
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        logger.info("Event with ID=%s deleted successfully.", event_id)
        return {"status": "deleted"}
    except Exception as e:
        logger.exception("Error deleting calendar event with ID=%s", event_id)
        raise Exception(f"Error deleting event: {e}")
