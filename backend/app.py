from flask import Flask
from flask_cors import CORS
from models.database import db
from config import Config
from routes.generate import generate_bp
from routes.templates import templates_bp
from routes.prompts import prompts_bp
from routes.history import history_bp
def create_app():
    """
    Application Factory Pattern:
    Instead of creating the app at module level, we wrap it in a function.
    This makes testing easier and avoids circular imports.
    """
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:8080", "http://127.0.0.1:8080",
                       "http://localhost:3000", "null"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    db.init_app(app)
    app.register_blueprint(generate_bp, url_prefix='/api')
    app.register_blueprint(templates_bp, url_prefix='/api')
    app.register_blueprint(prompts_bp, url_prefix='/api')
    app.register_blueprint(history_bp, url_prefix='/api')
    with app.app_context():
        db.create_all()
        _seed_templates()
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'Prompt Playground API is running'}, 200
    return app
def _seed_templates():
    """Load built-in templates from JSON file into database if not already there."""
    import json
    import os
    from models.database import PromptTemplate
    if PromptTemplate.query.count() > 0:
        return
    template_file = os.path.join(os.path.dirname(__file__), 'data', 'templates.json')
    if not os.path.exists(template_file):
        return
    with open(template_file, 'r') as f:
        templates = json.load(f)
    for t in templates:
        template = PromptTemplate(
            name=t['name'],
            description=t['description'],
            category=t['category'],
            technique=t['technique'],
            system_prompt=t.get('system_prompt', ''),
            user_prompt=t['user_prompt'],
            variables=json.dumps(t.get('variables', [])),
            tags=json.dumps(t.get('tags', [])),
            recommended_temperature=t.get('temperature', 0.7),
            recommended_max_tokens=t.get('max_tokens', 1024),
            is_builtin=True
        )
        db.session.add(template)
    db.session.commit()
    print(f"Seeded {len(templates)} built-in templates")
if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)