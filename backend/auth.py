# auth.py
import os
import uuid
from flask import Blueprint, request, jsonify, make_response
from user_store import upsert_user  # ensure this function is available and upserts user data in Supabase

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/set-token', methods=['POST'])
def set_token():
    """
    Stores the OAuth token details in Supabase with a generated session_id.
    The token data should include 'access_token', 'refresh_token', 'scope', and 'id_token'.
    If the refresh token is missing, ensure that you force a consent prompt so that Google returns one.
    """
    token_data = request.get_json()
    if not token_data:
        return jsonify({"error": "No token data provided"}), 400

    # Construct token object
    token = {
        'access_token': token_data.get('access_token'),
        'refresh_token': token_data.get('refresh_token'),  # May be None if not provided!
        'scope': token_data.get('scope'),
        'id_token': token_data.get('id_token')
    }
    user_email = token_data.get("email")
    
    # Generate a secure session_id if one isn't already provided in cookies
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid.uuid4())

    # Upsert the user in Supabase, saving the token and session_id persistently
    upsert_user(user_email, session_id, token)

    # Create a response and set the session_id as a secure, HttpOnly cookie
    response = make_response(jsonify({"status": "token set"}), 200)
    response.set_cookie(
        "session_id", session_id,
        secure=True,       # Use HTTPS in production
        httponly=True,     # Prevent JavaScript access to the cookie
        samesite="None"    # Adjust as needed for your deployment
    )
    return response
