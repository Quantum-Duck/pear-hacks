from supabase_client import supabase

def upsert_user(email, session_id, token):
    """
    Insert or update a user's information (email, session_id, and token).
    The 'users' table should have columns: email, session_id, token, and analysis.
    Upsert based on the unique email.
    """
    data = {
        "email": email,
        "session_id": session_id,
        "token": token
    }
    response = supabase.table("users").upsert(data, on_conflict="email").execute()
    print("Upsert response:", response)
    return response

def get_user_by_session(session_id):
    """
    Retrieve the user row by session_id.
    """
    response = supabase.table("users").select("*").eq("session_id", session_id).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None

def update_user_analysis(session_id, analysis):
    """
    Update the analysis profile for the user identified by session_id.
    """
    data = {
        "analysis": analysis
    }
    response = supabase.table("users").update(data).eq("session_id", session_id).execute()
    return response
