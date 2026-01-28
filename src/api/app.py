"""
Main Flask application entry point
Sample API application structure for DAEN Capstone projects
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['DEBUG'] = os.getenv('DEBUG', 'True') == 'True'

# Enable CORS
CORS(app)


@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Welcome to GMU DAEN Capstone Project API',
        'version': '0.1.0',
        'status': 'running'
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'DAEN Capstone API'
    }), 200


@app.route('/api/data', methods=['GET'])
def get_data():
    """Sample data endpoint"""
    return jsonify({
        'data': [],
        'message': 'This is a sample endpoint. Replace with your actual data logic.'
    })


@app.route('/api/data', methods=['POST'])
def post_data():
    """Sample POST endpoint"""
    data = request.get_json()
    return jsonify({
        'message': 'Data received successfully',
        'received': data
    }), 201


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


def main():
    """Main entry point"""
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()
