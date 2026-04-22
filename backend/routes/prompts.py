import json

from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_

from auth import login_required
from models.database import PromptTemplate, db

prompts_bp = Blueprint('prompts', __name__)


def _owned_or_builtin_prompt(prompt_id, user_id):
    prompt = PromptTemplate.query.get_or_404(prompt_id)
    if prompt.is_builtin or prompt.user_id == user_id:
        return prompt
    return None


@prompts_bp.route('/prompts', methods=['GET'])
@login_required
def list_prompts():
    """
    List saved prompts with optional filtering.
    Query params: ?search=email&category=Marketing&tag=newsletter
    """
    search = request.args.get('search', '').lower()
    category = request.args.get('category', '')
    include_builtin = request.args.get('include_builtin', 'true').lower() == 'true'

    user_id = g.current_user.id
    query = PromptTemplate.query

    if include_builtin:
        query = query.filter(
            or_(PromptTemplate.is_builtin.is_(True), PromptTemplate.user_id == user_id)
        )
    else:
        query = query.filter_by(is_builtin=False, user_id=user_id)

    if category:
        query = query.filter_by(category=category)

    prompts = query.order_by(PromptTemplate.updated_at.desc()).all()
    if search:
        prompts = [
            prompt for prompt in prompts
            if search in prompt.name.lower()
            or search in (prompt.description or '').lower()
            or search in (prompt.tags or '').lower()
        ]

    return jsonify({
        'prompts': [prompt.to_dict() for prompt in prompts],
        'total': len(prompts)
    }), 200


@prompts_bp.route('/prompts', methods=['POST'])
@login_required
def save_prompt():
    """Save a new prompt to the library."""
    data = request.get_json() or {}
    if not data.get('name') or not data.get('user_prompt'):
        return jsonify({'error': 'name and user_prompt are required'}), 400

    prompt = PromptTemplate(
        name=data['name'],
        description=data.get('description', ''),
        category=data.get('category', 'General'),
        technique=data.get('technique', 'zero-shot'),
        system_prompt=data.get('system_prompt', ''),
        user_prompt=data['user_prompt'],
        variables=json.dumps(data.get('variables', [])),
        tags=json.dumps(data.get('tags', [])),
        recommended_temperature=data.get('temperature', 0.7),
        recommended_max_tokens=data.get('max_tokens', 1024),
        is_builtin=False,
        user_id=g.current_user.id
    )
    db.session.add(prompt)
    db.session.commit()
    return jsonify(prompt.to_dict()), 201


@prompts_bp.route('/prompts/<int:prompt_id>', methods=['GET'])
@login_required
def get_prompt(prompt_id):
    """Get a specific prompt by ID."""
    prompt = _owned_or_builtin_prompt(prompt_id, g.current_user.id)
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404
    return jsonify(prompt.to_dict()), 200


@prompts_bp.route('/prompts/<int:prompt_id>', methods=['PUT'])
@login_required
def update_prompt(prompt_id):
    """
    Update a prompt, creating a new version.
    USE CASE: Version history - if a user edits a saved prompt,
    we save the old version as parent_id so they can compare v1 vs v2.
    """
    old_prompt = PromptTemplate.query.get_or_404(prompt_id)
    if old_prompt.is_builtin:
        return jsonify({'error': 'Built-in templates cannot be edited'}), 403
    if old_prompt.user_id != g.current_user.id:
        return jsonify({'error': 'You do not have access to this prompt'}), 403

    data = request.get_json() or {}
    new_prompt = PromptTemplate(
        name=data.get('name', old_prompt.name),
        description=data.get('description', old_prompt.description),
        category=data.get('category', old_prompt.category),
        technique=data.get('technique', old_prompt.technique),
        system_prompt=data.get('system_prompt', old_prompt.system_prompt),
        user_prompt=data.get('user_prompt', old_prompt.user_prompt),
        variables=json.dumps(data.get('variables', json.loads(old_prompt.variables or '[]'))),
        tags=json.dumps(data.get('tags', json.loads(old_prompt.tags or '[]'))),
        recommended_temperature=data.get('temperature', old_prompt.recommended_temperature),
        recommended_max_tokens=data.get('max_tokens', old_prompt.recommended_max_tokens),
        recommended_top_p=data.get('top_p', old_prompt.recommended_top_p),
        is_builtin=False,
        version=old_prompt.version + 1,
        parent_id=old_prompt.id,
        user_id=g.current_user.id
    )
    db.session.add(new_prompt)
    db.session.commit()
    return jsonify(new_prompt.to_dict()), 200


@prompts_bp.route('/prompts/<int:prompt_id>', methods=['DELETE'])
@login_required
def delete_prompt(prompt_id):
    """Delete a saved prompt (cannot delete built-in templates)."""
    prompt = PromptTemplate.query.get_or_404(prompt_id)
    if prompt.is_builtin:
        return jsonify({'error': 'Cannot delete built-in templates'}), 403
    if prompt.user_id != g.current_user.id:
        return jsonify({'error': 'You do not have access to this prompt'}), 403

    db.session.delete(prompt)
    db.session.commit()
    return jsonify({'message': 'Prompt deleted successfully'}), 200


@prompts_bp.route('/export', methods=['GET'])
@login_required
def export_prompts():
    """Export all user prompts as a JSON file."""
    from flask import make_response

    user_prompts = PromptTemplate.query.filter_by(
        is_builtin=False,
        user_id=g.current_user.id
    ).all()
    data = json.dumps([prompt.to_dict() for prompt in user_prompts], indent=2)
    response = make_response(data)
    response.headers['Content-Type'] = 'application/json'
    response.headers['Content-Disposition'] = 'attachment; filename=my_prompts.json'
    return response


@prompts_bp.route('/import', methods=['POST'])
@login_required
def import_prompts():
    """Import prompts from a JSON file upload."""
    if 'file' not in request.files:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No file or JSON data provided'}), 400
        prompts_data = data if isinstance(data, list) else [data]
    else:
        file = request.files['file']
        prompts_data = json.loads(file.read())

    imported = 0
    for prompt_data in prompts_data:
        prompt = PromptTemplate(
            name=prompt_data.get('name', 'Imported Prompt'),
            description=prompt_data.get('description', ''),
            category=prompt_data.get('category', 'General'),
            technique=prompt_data.get('technique', 'zero-shot'),
            system_prompt=prompt_data.get('system_prompt', ''),
            user_prompt=prompt_data.get('user_prompt', ''),
            variables=json.dumps(prompt_data.get('variables', [])),
            tags=json.dumps(prompt_data.get('tags', [])),
            is_builtin=False,
            user_id=g.current_user.id
        )
        db.session.add(prompt)
        imported += 1

    db.session.commit()
    return jsonify({'message': f'Imported {imported} prompts'}), 200
