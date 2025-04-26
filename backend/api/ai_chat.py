# api/ai_chat.py
from flask import Blueprint, request, jsonify
from services.ai_service import process_chat
from user_store import get_user_by_session  # Optional: used to verify the user exists

ai_chat_bp = Blueprint('ai_chat', __name__)

@ai_chat_bp.route('/', methods=['POST'])
def ai_chat():
    # Check for session_id cookie to ensure the user is authenticated
    session_id = request.cookies.get("session_id")
    if not session_id:
        return jsonify({'error': 'User not authenticated'}), 401

    # Optionally verify the user exists in Supabase
    # user = get_user_by_session(session_id)
    # if not user:
    #     return jsonify({'error': 'User not found'}), 401

    data = request.get_json()
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    try:
        answer = process_chat(prompt)
        return jsonify({'response': answer})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
