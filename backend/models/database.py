from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
db = SQLAlchemy()
class PromptTemplate(db.Model):
    """
    Stores both built-in templates (is_builtin=True) and user-saved prompts.
    USE CASE: The Prompt Library screen reads from this table.
    When a user clicks a template, the frontend fetches it by ID.
    """
    __tablename__ = 'prompt_templates'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    category = db.Column(db.String(100), default='General')  # e.g., "Content Writing", "Code"
    technique = db.Column(db.String(100), default='zero-shot')  # Prompt technique used
    system_prompt = db.Column(db.Text, default='')
    user_prompt = db.Column(db.Text, nullable=False)
    variables = db.Column(db.Text, default='[]')   # JSON array: ["product_name", "tone"]
    tags = db.Column(db.Text, default='[]')         # JSON array: ["marketing", "email"]
    recommended_temperature = db.Column(db.Float, default=0.7)
    recommended_max_tokens = db.Column(db.Integer, default=1024)
    recommended_top_p = db.Column(db.Float, default=0.9)
    is_builtin = db.Column(db.Boolean, default=False)  # True = pre-loaded, False = user-created
    version = db.Column(db.Integer, default=1)
    parent_id = db.Column(db.Integer, db.ForeignKey('prompt_templates.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    def to_dict(self):
        """Convert model to dictionary for JSON API responses."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'technique': self.technique,
            'system_prompt': self.system_prompt,
            'user_prompt': self.user_prompt,
            'variables': json.loads(self.variables or '[]'),
            'tags': json.loads(self.tags or '[]'),
            'recommended_temperature': self.recommended_temperature,
            'recommended_max_tokens': self.recommended_max_tokens,
            'recommended_top_p': self.recommended_top_p,
            'is_builtin': self.is_builtin,
            'version': self.version,
            'parent_id': self.parent_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
class ExecutionHistory(db.Model):
    """
    Records every LLM call made through the playground.
    USE CASE: The History screen shows past executions.
    Users can re-run or review what parameters produced what output.
    Also useful for debugging and cost tracking.
    """
    __tablename__ = 'execution_history'
    id = db.Column(db.Integer, primary_key=True)
    system_prompt = db.Column(db.Text, default='')
    user_prompt = db.Column(db.Text, nullable=False)
    output = db.Column(db.Text, default='')
    model = db.Column(db.String(100), default='llama-3.1-8b-instant')
    provider = db.Column(db.String(50), default='groq')
    temperature = db.Column(db.Float, default=0.7)
    max_tokens = db.Column(db.Integer, default=1024)
    top_p = db.Column(db.Float, default=0.9)
    frequency_penalty = db.Column(db.Float, default=0.0)
    presence_penalty = db.Column(db.Float, default=0.0)
    stop_sequences = db.Column(db.Text, default='[]')
    technique = db.Column(db.String(100), default='zero-shot')
    template_id = db.Column(db.Integer, nullable=True)
    input_tokens = db.Column(db.Integer, default=0)
    output_tokens = db.Column(db.Integer, default=0)
    latency_ms = db.Column(db.Integer, default=0)  # Response time in milliseconds
    estimated_cost = db.Column(db.Float, default=0.0)  # Cost in USD
    rating = db.Column(db.Integer, nullable=True)  # 1-5 stars
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    def to_dict(self):
        return {
            'id': self.id,
            'system_prompt': self.system_prompt,
            'user_prompt': self.user_prompt[:200] + '...' if len(self.user_prompt) > 200 else self.user_prompt,
            'user_prompt_full': self.user_prompt,
            'output': self.output,
            'model': self.model,
            'provider': self.provider,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'top_p': self.top_p,
            'technique': self.technique,
            'input_tokens': self.input_tokens,
            'output_tokens': self.output_tokens,
            'latency_ms': self.latency_ms,
            'estimated_cost': self.estimated_cost,
            'rating': self.rating,
            'created_at': self.created_at.isoformat()
        }