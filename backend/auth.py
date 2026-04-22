from functools import wraps

from flask import g, jsonify, request

from models.database import User


def _extract_token():
    auth_header = request.headers.get('Authorization', '').strip()
    if auth_header.lower().startswith('bearer '):
        return auth_header.split(' ', 1)[1].strip()
    return request.headers.get('X-Auth-Token', '').strip()


def get_current_user():
    token = _extract_token()
    if not token:
        return None
    return User.query.filter_by(auth_token=token).first()


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        g.current_user = user
        return view_func(*args, **kwargs)

    return wrapped
