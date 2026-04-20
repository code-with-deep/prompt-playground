import json
import re
def parse_output(text: str) -> dict:
    """
    Analyze LLM output and identify its format/structure.
    Returns a dict describing what was found so the frontend
    can render it appropriately.
    """
    result = {
        'raw': text,
        'type': 'text',   # default type
        'parsed': None,
        'code_blocks': [],
        'tables': [],
        'is_valid_json': False,
        'json_error': None
    }
    stripped = text.strip()
    if stripped.startswith('{') or stripped.startswith('['):
        try:
            parsed_json = json.loads(stripped)
            result['type'] = 'json'
            result['parsed'] = parsed_json
            result['is_valid_json'] = True
        except json.JSONDecodeError as e:
            result['json_error'] = str(e)
    code_pattern = re.compile(r'```(\w+)?\n?(.*?)```', re.DOTALL)
    code_matches = code_pattern.findall(text)
    if code_matches:
        result['code_blocks'] = [
            {'language': lang or 'text', 'code': code.strip()}
            for lang, code in code_matches
        ]
        if result['type'] == 'text':
            result['type'] = 'code'
    table_pattern = re.compile(r'(\|.+\|\n)+', re.MULTILINE)
    tables = table_pattern.findall(text)
    if tables:
        result['tables'] = tables
        if result['type'] == 'text':
            result['type'] = 'markdown'
    if re.search(r'(^#{1,6} |\*\*|__|^- |\d+\. )', text, re.MULTILINE):
        if result['type'] == 'text':
            result['type'] = 'markdown'
    return result
def validate_json_schema(json_text: str, schema: dict) -> dict:
    """
    Validate LLM JSON output against a user-provided schema.
    USE CASE: User wants the LLM to output {"name": str, "score": int}.
    They provide the schema, and this validates the LLM's output matches it.
    """
    try:
        import jsonschema
        data = json.loads(json_text.strip())
        jsonschema.validate(instance=data, schema=schema)
        return {'valid': True, 'errors': []}
    except json.JSONDecodeError as e:
        return {'valid': False, 'errors': [f'Invalid JSON: {str(e)}']}
    except jsonschema.ValidationError as e:
        return {'valid': False, 'errors': [e.message]}
    except Exception as e:
        return {'valid': False, 'errors': [str(e)]}