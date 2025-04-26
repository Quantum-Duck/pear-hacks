# api/automations.py
from flask import Blueprint, jsonify, request
from datetime import datetime
from supabase_client import supabase
from user_store import get_user_by_session

automations_bp = Blueprint('automations', __name__, url_prefix='/api/automations')

@automations_bp.route('/', methods=['GET'])
def list_automations():
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_session(session_id)
    if not user:
        return jsonify({"error": "Invalid session"}), 401

    resp = (
        supabase
        .table("automations")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    result = resp.dict()
    if result.get("error"):
        return jsonify({"error": result["error"]}), 500

    return jsonify({"automations": result.get("data", [])}), 200

@automations_bp.route('/', methods=['POST'])
def create_automation():
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_session(session_id)
    if not user:
        return jsonify({"error": "Invalid session"}), 401

    payload = request.get_json() or {}
    name = payload.get("name")
    flow = payload.get("flow")
    if not name or not isinstance(flow, dict):
        return jsonify({"error": "Missing name or flow"}), 400

    record = {
        "user_id": user["id"],
        "name": name,
        "flow": flow,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    resp = supabase.table("automations").insert(record).execute()
    result = resp.dict()
    if result.get("error"):
        return jsonify({"error": result["error"]}), 500

    automation = (result.get("data") or [])[0]
    return jsonify({"automation": automation}), 201

@automations_bp.route('/<int:automation_id>', methods=['GET'])
def get_automation(automation_id):
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_session(session_id)
    if not user:
        return jsonify({"error": "Invalid session"}), 401

    resp = (
        supabase
        .table("automations")
        .select("*")
        .eq("user_id", user["id"])
        .eq("id", automation_id)
        .single()
        .execute()
    )
    result = resp.dict()
    if result.get("error") or result.get("data") is None:
        return jsonify({"error": result.get("error", "Not found")}), 404

    return jsonify(result["data"]), 200

@automations_bp.route('/<int:automation_id>', methods=['PUT'])
def update_automation(automation_id):
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({"error": "Not authenticated"}), 401

    user = get_user_by_session(session_id)
    if not user:
        return jsonify({"error": "Invalid session"}), 401

    payload = request.get_json() or {}
    updates = {}
    if "flow" in payload and isinstance(payload["flow"], dict):
        updates["flow"] = payload["flow"]
    if "name" in payload and isinstance(payload["name"], str):
        updates["name"] = payload["name"]
    if not updates:
        return jsonify({"error": "Nothing to update"}), 400

    resp = (
        supabase
        .table("automations")
        .update(updates)
        .eq("user_id", user["id"])
        .eq("id", automation_id)
        .execute()
    )
    result = resp.dict()
    if result.get("error"):
        return jsonify({"error": result["error"]}), 500

    updated = (result.get("data") or [])[0]
    return jsonify(updated), 200
