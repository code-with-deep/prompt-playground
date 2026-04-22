import secrets

from flask import Blueprint, g, jsonify, request

from auth import login_required
from models.database import User, db

auth_bp = Blueprint('auth', __name__)


def _issue_token(user):
    user.auth_token = secrets.token_urlsafe(32)
    db.session.commit()
    return user.auth_token


@auth_bp.route('/auth/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if not email or '@' not in email:
        return jsonify({'error': 'A valid email is required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 409

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = _issue_token(user)
    return jsonify({
        'message': 'Account created successfully',
        'token': token,
        'user': user.to_dict()
    }), 201


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}

    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = _issue_token(user)
    return jsonify({
        'message': 'Logged in successfully',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/auth/me', methods=['GET'])
@login_required
def me():
    return jsonify({'user': g.current_user.to_dict()}), 200


@auth_bp.route('/auth/logout', methods=['POST'])
@login_required
def logout():
    g.current_user.auth_token = None
    db.session.commit()
    return jsonify({'message': 'Logged out successfully'}), 200
