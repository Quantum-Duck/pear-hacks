# utils/supabase_utils.py
from flask import request
from user_store import get_user_by_session  # your function to retrieve user info from Supabase

def get_token_from_supabase():
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise Exception("Missing session identifier in cookies.")
    user = get_user_by_session(session_id)
    if not user or not user.get("token"):
        raise Exception("User not authenticated or token not found in Supabase.")
    return user["token"]
