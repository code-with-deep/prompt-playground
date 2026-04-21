from flask import Flask
from flask_cors import CORS
from models.database import db
from config import Config
from routes.generate import generate_bp
from routes.templates import templates_bp
from routes.prompts import prompts_bp
from routes.history import history_bp
import os


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize DB
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(generate_bp, url_prefix='/api')
    app.register_blueprint(templates_bp, url_prefix='/api')
    app.register_blueprint(prompts_bp, url_prefix='/api')
    app.register_blueprint(history_bp, url_prefix='/api')

    
    with app.app_context():
        db.create_all()
        _seed_templates()  # Always seed — count check inside prevents duplicates

    # Health check route
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'API running'}, 200

    # Root route
    @app.route('/')
    def home():
        return "Backend is running 🚀"

    return app


def _seed_templates():
    import json
    from models.database import PromptTemplate

    if PromptTemplate.query.count() > 0:
        return

    template_file = os.path.join(os.path.dirname(__file__), 'data', 'templates.json')

    
    if not os.path.exists(template_file):
        print("⚠️ templates.json not found, skipping seeding")
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
    print(f"✅ Seeded {len(templates)} built-in templates")


# ✅ Required for Gunicorn
app = create_app()


# Run locally
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)