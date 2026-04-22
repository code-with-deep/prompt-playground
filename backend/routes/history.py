from flask import Blueprint, g, jsonify, request

from auth import login_required
from models.database import ExecutionHistory, db

history_bp = Blueprint('history', __name__)


@history_bp.route('/history', methods=['GET'])
@login_required
def get_history():
    """
    Return paginated execution history.
    Query params: ?page=1&limit=20&technique=chain-of-thought&min_rating=4
    """
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    technique = request.args.get('technique', '')
    min_rating = request.args.get('min_rating', None)

    query = ExecutionHistory.query.filter_by(user_id=g.current_user.id)
    if technique:
        query = query.filter_by(technique=technique)
    if min_rating:
        query = query.filter(ExecutionHistory.rating >= int(min_rating))

    total = query.count()
    entries = query.order_by(ExecutionHistory.created_at.desc()) \
        .offset((page - 1) * limit) \
        .limit(limit).all()

    return jsonify({
        'history': [entry.to_dict() for entry in entries],
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    }), 200


@history_bp.route('/history/<int:history_id>/rate', methods=['POST'])
@login_required
def rate_execution(history_id):
    """
    Save user rating for an execution.
    USE CASE: After seeing the output, user gives 1-5 stars.
    This helps track which prompts/parameters work best.
    """
    entry = ExecutionHistory.query.get_or_404(history_id)
    if entry.user_id != g.current_user.id:
        return jsonify({'error': 'You do not have access to this history entry'}), 403

    data = request.get_json() or {}
    rating = data.get('rating')
    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({'error': 'Rating must be 1-5'}), 400

    entry.rating = int(rating)
    db.session.commit()
    return jsonify({'message': 'Rating saved'}), 200


@history_bp.route('/history/<int:history_id>', methods=['GET'])
@login_required
def get_history_entry(history_id):
    """
    Get a single history entry by ID.
    USE CASE: Re-run from history - fetch the exact entry to load
    its prompts back into the playground without re-fetching the entire list.
    """
    entry = ExecutionHistory.query.get_or_404(history_id)
    if entry.user_id != g.current_user.id:
        return jsonify({'error': 'You do not have access to this history entry'}), 403
    return jsonify(entry.to_dict()), 200
