# api/nodes.py

from __future__ import annotations
from typing import Any, Dict, List
import datetime as _dt
import base64
import json
import os
import smtplib
from email.mime.text import MIMEText

from flask import Blueprint, jsonify, request
from supabase_client import supabase
from user_store import get_user_by_session

# Import your calendar service so we can actually create real events
from services.calendar_service import create_event

nodes_bp = Blueprint("nodes", __name__, url_prefix="/api")


def _gmail_send(cfg: Dict[str, Any]) -> Dict[str, Any]:
    required = ("to", "subject", "body")
    if not all(k in cfg and cfg[k] for k in required):
        raise ValueError("Missing to/subject/body")
    msg = MIMEText(cfg["body"])
    msg["Subject"] = cfg["subject"]
    msg["To"] = cfg["to"]
    msg["From"] = os.environ["GMAIL_ADDRESS"]
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(os.environ["GMAIL_ADDRESS"], os.environ["GMAIL_APP_PWD"])
        s.sendmail(msg["From"], [cfg["to"]], msg.as_string())
    return {"status": "sent", "ts": _dt.datetime.utcnow().isoformat() + "Z"}


def _calendar_create(cfg: Dict[str, Any]) -> Dict[str, Any]:
    # Ensure we have the required fields
    required = ("summary", "start", "end")
    if not all(cfg.get(k) for k in required):
        raise ValueError("Missing summary/start/end")

    # Extract required parameters
    summary   = cfg["summary"]
    start_iso = cfg["start"]
    end_iso   = cfg["end"]

    # Optional parameters
    location    = cfg.get("location")
    description = cfg.get("description")
    attendees   = None
    if cfg.get("attendees"):
        # Support comma‑separated list of emails
        attendees = [e.strip() for e in cfg["attendees"].split(",") if e.strip()]

    # Call your calendar service to create the event
    event = create_event(
        summary,
        start_iso,
        end_iso,
        location=location,
        description=description,
        attendees=attendees,
    )

    # Return the full event object (including its real ID)
    return event


NODE_REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "trigger_user_input",
        "label": "User Input",
        "color": "bg-blue-500",
        "category": "Trigger",
        "schema": {
            "type": "object",
            "properties": {
                "input": {"type": "string", "title": "Input"}
            },
            "required": ["input"],
        },
        "run": lambda cfg: {"input": cfg.get("input", "")},
    },
    {
        "id": "trigger_email",
        "label": "Email Received",
        "color": "bg-purple-500",
        "category": "Trigger",
        "schema": {"type": "object", "properties": {}},
        "run": lambda cfg: {"status": "ok"},
    },
    {
        "id": "action_send_email",
        "label": "Send Email",
        "color": "bg-red-500",
        "category": "Action",
        "schema": {
            "type": "object",
            "properties": {
                "to":      {"type": "string", "title": "To Address"},
                "subject": {"type": "string", "title": "Subject"},
                "body":    {"type": "string", "title": "Body", "x_widget": "textarea"},
            },
            "required": ["to", "subject"],
        },
        "run": _gmail_send,
    },
    {
        "id": "action_create_event",
        "label": "Create Calendar Event",
        "color": "bg-green-500",
        "category": "Action",
        "schema": {
            "type": "object",
            "properties": {
                "summary":   {"type": "string", "title": "Title"},
                "start":     {"type": "string", "title": "Start (ISO)"},
                "end":       {"type": "string", "title": "End (ISO)"},
                "location":  {"type": "string", "title": "Location", "x_widget": "textarea"},
                "description": {"type": "string", "title": "Description", "x_widget": "textarea"},
                "attendees": {"type": "string", "title": "Attendees (comma‑separated)"},
            },
            "required": ["summary", "start", "end"],
        },
        "run": _calendar_create,
    },
]


@nodes_bp.route("/nodes", methods=["GET"])
def list_nodes():
    public = [{k: v for k, v in n.items() if k != "run"} for n in NODE_REGISTRY]
    return jsonify({"nodes": public}), 200


@nodes_bp.route("/run-node", methods=["POST"])
def run_node():
    payload = request.get_json(force=True) or {}
    node_id = payload.get("id")
    cfg     = payload.get("config", {})
    node    = next((n for n in NODE_REGISTRY if n["id"] == node_id), None)
    if not node:
        return jsonify({"error": f"Node '{node_id}' not found"}), 404
    try:
        result = node["run"](cfg)
        return jsonify({"result": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
