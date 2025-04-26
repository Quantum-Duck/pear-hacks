import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from api.emails import emails_bp
from api.calendar import calendar_bp
from api.ai_chat import ai_chat_bp
from api.automations import automations_bp
from api.nodes import nodes_bp
from auth import auth_bp 

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Update session cookie configuration to allow cross-origin credentials.
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",  # Use "Lax" in development; consider "None" with HTTPS in production.
    SESSION_COOKIE_SECURE=False,    # Set to True in production when using HTTPS.
    SECRET_KEY=os.urandom(24)         # Temporary secret key for development; replace with a persistent key in production.
)

# Enable CORS for all routes and allow credentials.
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})
logger.info("CORS configured to allow all origins with credentials.")

# Log incoming requests for debugging.
@app.before_request
def log_request_info():
    logger.debug(f"Incoming request: {request.method} {request.url} from {request.remote_addr}")

# Register error handler for 403 to ensure CORS headers are added.
@app.errorhandler(403)
def handle_forbidden(e):
    logger.error(f"403 Forbidden: {e}")
    response = jsonify({'error': 'Forbidden', 'message': str(e)})
    response.status_code = 403
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

logger.info("Registering blueprints")
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(emails_bp, url_prefix='/api/emails')
app.register_blueprint(calendar_bp, url_prefix='/api/calendar')
app.register_blueprint(ai_chat_bp, url_prefix='/api/ai-chat')
app.register_blueprint(automations_bp, url_prefix='/api/automations')
app.register_blueprint(nodes_bp)

@app.route('/')
def index():
    logger.info("Received request for index route")
    return "Backend server is running with extended Gmail and Calendar functionality."

if __name__ == '__main__':
    logger.info("Starting server on port 5000")
    # Use 'localhost' here to ensure a consistent hostname with your frontend.
    app.run(debug=True, host="localhost", port=5000)
