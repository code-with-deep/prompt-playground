from flask import Blueprint, request, jsonify
from models.database import db, PromptTemplate
import json
prompts_bp = Blueprint('prompts', __name__)
@prompts_bp.route('/prompts', methods=['GET'])
def list_prompts():
    """
    List saved prompts with optional filtering.
    Query params: ?search=email&category=Marketing&tag=newsletter
    """
    search = request.args.get('search', '').lower()
    category = request.args.get('category', '')
    include_builtin = request.args.get('include_builtin', 'true').lower() == 'true'
    query = PromptTemplate.query
    if not include_builtin:
        query = query.filter_by(is_builtin=False)
    if category:
        query = query.filter_by(category=category)
    prompts = query.order_by(PromptTemplate.updated_at.desc()).all()
    if search:
        prompts = [
            p for p in prompts
            if search in p.name.lower()
            or search in (p.description or '').lower()
            or search in (p.tags or '').lower()
        ]
    return jsonify({
        'prompts': [p.to_dict() for p in prompts],
        'total': len(prompts)
    }), 200
@prompts_bp.route('/prompts', methods=['POST'])
def save_prompt():
    """Save a new prompt to the library."""
    data = request.get_json()
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
        is_builtin=False
    )
    db.session.add(prompt)
    db.session.commit()
    return jsonify(prompt.to_dict()), 201
@prompts_bp.route('/prompts/<int:prompt_id>', methods=['GET'])
def get_prompt(prompt_id):
    """Get a specific prompt by ID."""
    prompt = PromptTemplate.query.get_or_404(prompt_id)
    return jsonify(prompt.to_dict()), 200
@prompts_bp.route('/prompts/<int:prompt_id>', methods=['PUT'])
def update_prompt(prompt_id):
    """
    Update a prompt, creating a new version.
    USE CASE: Version history — if a user edits a saved prompt,
    we save the old version as parent_id so they can compare v1 vs v2.
    """
    old_prompt = PromptTemplate.query.get_or_404(prompt_id)
    data = request.get_json()
    new_prompt = PromptTemplate(
        name=data.get('name', old_prompt.name),
        description=data.get('description', old_prompt.description),
        category=data.get('category', old_prompt.category),
        technique=data.get('technique', old_prompt.technique),
        system_prompt=data.get('system_prompt', old_prompt.system_prompt),
        user_prompt=data.get('user_prompt', old_prompt.user_prompt),
        variables=json.dumps(data.get('variables', [])),
        tags=json.dumps(data.get('tags', [])),
        recommended_temperature=data.get('temperature', old_prompt.recommended_temperature),
        recommended_max_tokens=data.get('max_tokens', old_prompt.recommended_max_tokens),
        is_builtin=False,
        version=old_prompt.version + 1,
        parent_id=old_prompt.id
    )
    db.session.add(new_prompt)
    db.session.commit()
    return jsonify(new_prompt.to_dict()), 200
@prompts_bp.route('/prompts/<int:prompt_id>', methods=['DELETE'])
def delete_prompt(prompt_id):
    """Delete a saved prompt (cannot delete built-in templates)."""
    prompt = PromptTemplate.query.get_or_404(prompt_id)
    if prompt.is_builtin:
        return jsonify({'error': 'Cannot delete built-in templates'}), 403
    db.session.delete(prompt)
    db.session.commit()
    return jsonify({'message': 'Prompt deleted successfully'}), 200
@prompts_bp.route('/export', methods=['GET'])
def export_prompts():
    """Export all user prompts as a JSON file."""
    from flask import make_response
    user_prompts = PromptTemplate.query.filter_by(is_builtin=False).all()
    data = json.dumps([p.to_dict() for p in user_prompts], indent=2)
    response = make_response(data)
    response.headers['Content-Type'] = 'application/json'
    response.headers['Content-Disposition'] = 'attachment; filename=my_prompts.json'
    return response
@prompts_bp.route('/import', methods=['POST'])
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
    for p_data in prompts_data:
        prompt = PromptTemplate(
            name=p_data.get('name', 'Imported Prompt'),
            description=p_data.get('description', ''),
            category=p_data.get('category', 'General'),
            technique=p_data.get('technique', 'zero-shot'),
            system_prompt=p_data.get('system_prompt', ''),
            user_prompt=p_data.get('user_prompt', ''),
            variables=json.dumps(p_data.get('variables', [])),
            tags=json.dumps(p_data.get('tags', [])),
            is_builtin=False
        )
        db.session.add(prompt)
        imported += 1
    db.session.commit()
    return jsonify({'message': f'Imported {imported} prompts'}), 200