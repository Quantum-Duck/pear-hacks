# api/calendar.py
from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta  # Added timedelta import
from services.calendar_service import (
    list_events,
    create_event,
    update_event,
    delete_event
)

calendar_bp = Blueprint('calendar', __name__)

# GET /api/calendar/ -> List events for the current week
@calendar_bp.route('/', methods=['GET'])
def get_calendar_events():
    try:
        # Calculate current week's start (Monday 00:00:00 UTC) and end (Sunday 23:59:59 UTC)
        now = datetime.utcnow()
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
        start_iso = start_of_week.isoformat() + 'Z'
        end_iso = end_of_week.isoformat() + 'Z'
        
        # Fetch events for the current week. Increase max_results as needed.
        events = list_events(max_results=100, time_min=start_iso, time_max=end_iso)
        return jsonify(events)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# POST /api/calendar/ -> Create a new event
@calendar_bp.route('/', methods=['POST'])
def api_create_event():
    data = request.get_json()
    try:
        summary = data['summary']
        start_time = data['start_time']
        end_time = data['end_time']
        location = data.get('location')
        description = data.get('description')
        attendees = data.get('attendees')
        event = create_event(summary, start_time, end_time, location, description, attendees)
        return jsonify(event)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# PUT /api/calendar/<event_id> -> Update an existing event
@calendar_bp.route('/<event_id>', methods=['PUT'])
def api_update_event(event_id):
    data = request.get_json()
    try:
        summary = data.get('summary')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        location = data.get('location')
        description = data.get('description')
        attendees = data.get('attendees')
        event = update_event(event_id, summary, start_time, end_time, location, description, attendees)
        return jsonify(event)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# DELETE /api/calendar/<event_id> -> Delete an event
@calendar_bp.route('/<event_id>', methods=['DELETE'])
def api_delete_event(event_id):
    try:
        result = delete_event(event_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400
