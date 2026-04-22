from flask import Blueprint, g, jsonify, request

from auth import login_required
from models.database import ExecutionHistory, db
from services.llm_service import call_llm
from services.output_parser import parse_output
from services.token_counter import count_tokens

generate_bp = Blueprint('generate', __name__)


def _save_to_history(prompt_data, result, user_id):
    """Helper: Save execution to database for history tracking."""
    history = ExecutionHistory(
        system_prompt=prompt_data.get('system_prompt', ''),
        user_prompt=prompt_data.get('user_prompt', ''),
        output=result.get('output', ''),
        model=result.get('model', ''),
        provider=result.get('provider', ''),
        temperature=prompt_data.get('temperature', 0.7),
        max_tokens=prompt_data.get('max_tokens', 1024),
        top_p=prompt_data.get('top_p', 0.9),
        frequency_penalty=prompt_data.get('frequency_penalty', 0.0),
        presence_penalty=prompt_data.get('presence_penalty', 0.0),
        technique=prompt_data.get('technique', 'zero-shot'),
        input_tokens=result.get('input_tokens', 0),
        output_tokens=result.get('output_tokens', 0),
        latency_ms=result.get('latency_ms', 0),
        estimated_cost=result.get('estimated_cost', 0.0),
        user_id=user_id
    )
    db.session.add(history)
    db.session.commit()
    return history.id


@generate_bp.route('/generate', methods=['POST'])
@login_required
def generate():
    """
    Main generation endpoint.
    Request body: {
        system_prompt: "You are a helpful assistant",
        user_prompt: "Explain recursion",
        provider: "groq",
        temperature: 0.3,
        max_tokens: 1024,
        top_p: 0.9,
        technique: "chain-of-thought"
    }
    """
    try:
        data = request.get_json() or {}
        if not data.get('user_prompt'):
            return jsonify({'error': 'user_prompt is required'}), 400

        result = call_llm(
            system_prompt=data.get('system_prompt', ''),
            user_prompt=data.get('user_prompt', ''),
            params=data
        )
        result['parsed_output'] = parse_output(result['output'])
        result['history_id'] = _save_to_history(data, result, g.current_user.id)
        return jsonify(result), 200
    except Exception as exc:
        error_msg = str(exc)
        if 'API_KEY' in error_msg or 'api_key' in error_msg:
            return jsonify({'error': 'Invalid or missing API key. Check your .env file.'}), 401
        if 'quota' in error_msg.lower() or 'rate' in error_msg.lower():
            return jsonify({'error': 'Rate limit exceeded. Wait a moment and try again.'}), 429
        return jsonify({'error': f'Generation failed: {error_msg}'}), 500


@generate_bp.route('/compare', methods=['POST'])
@login_required
def compare():
    """
    Run two prompts and return both results.
    USE CASE: Compare two prompt setups and inspect their outputs side-by-side.
    """
    try:
        data = request.get_json() or {}
        prompt_a = data.get('prompt_a', {})
        prompt_b = data.get('prompt_b', {})
        if not prompt_a.get('user_prompt') or not prompt_b.get('user_prompt'):
            return jsonify({'error': 'Both prompt_a and prompt_b with user_prompt are required'}), 400

        result_a = call_llm(
            system_prompt=prompt_a.get('system_prompt', ''),
            user_prompt=prompt_a['user_prompt'],
            params=prompt_a
        )
        result_a['parsed_output'] = parse_output(result_a['output'])
        _save_to_history(prompt_a, result_a, g.current_user.id)

        result_b = call_llm(
            system_prompt=prompt_b.get('system_prompt', ''),
            user_prompt=prompt_b['user_prompt'],
            params=prompt_b
        )
        result_b['parsed_output'] = parse_output(result_b['output'])
        _save_to_history(prompt_b, result_b, g.current_user.id)

        return jsonify({
            'result_a': result_a,
            'result_b': result_b
        }), 200
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@generate_bp.route('/sweep', methods=['POST'])
@login_required
def sweep():
    """
    Run the same prompt with different values of a parameter.
    USE CASE: Sweep temperature, top_p, or token count and compare the outputs.
    """
    try:
        data = request.get_json() or {}
        base_prompt = data.get('prompt', {})
        sweep_param = data.get('sweep_param', 'temperature')
        sweep_values = data.get('sweep_values', [0.0, 0.3, 0.7, 1.0, 1.5])

        if not base_prompt.get('user_prompt'):
            return jsonify({'error': 'prompt.user_prompt is required'}), 400

        results = []
        for value in sweep_values:
            params = {**base_prompt, sweep_param: value}
            result = call_llm(
                system_prompt=base_prompt.get('system_prompt', ''),
                user_prompt=base_prompt['user_prompt'],
                params=params
            )
            result['sweep_value'] = value
            result['sweep_param'] = sweep_param
            result['parsed_output'] = parse_output(result['output'])
            _save_to_history(params, result, g.current_user.id)
            results.append(result)

        return jsonify({'results': results, 'sweep_param': sweep_param}), 200
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@generate_bp.route('/count-tokens', methods=['POST'])
def count_tokens_endpoint():
    """
    Return estimated token count for a prompt.
    USE CASE: Frontend calls this as the user types to show a live indicator.
    """
    data = request.get_json() or {}
    text = data.get('text', '')
    count = count_tokens(text)
    return jsonify({'tokens': count, 'characters': len(text)}), 200
