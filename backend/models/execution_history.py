from .database import db
from sqlalchemy.sql import func

class ExecutionHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    system_prompt = db.Column(db.Text)
    user_prompt = db.Column(db.Text, nullable=False)
    output = db.Column(db.Text, nullable=False)
    model = db.Column(db.String(100), nullable=False)
    provider = db.Column(db.String(100))
    temperature = db.Column(db.Float, default=0.7)
    max_tokens = db.Column(db.Integer, default=1024)
    top_p = db.Column(db.Float)
    frequency_penalty = db.Column(db.Float)
    presence_penalty = db.Column(db.Float)
    stop_sequences = db.Column(db.String(200))
    technique = db.Column(db.String(100))
    template_id = db.Column(db.Integer, db.ForeignKey('prompt_template.id'))
    input_tokens = db.Column(db.Integer)
    output_tokens = db.Column(db.Integer)
    latency_ms = db.Column(db.Integer)
    estimated_cost = db.Column(db.Float)
    rating = db.Column(db.Integer)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'system_prompt': self.system_prompt,
            'user_prompt': self.user_prompt,
            'output': self.output,
            'model': self.model,
            'provider': self.provider,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'top_p': self.top_p,
            'frequency_penalty': self.frequency_penalty,
            'presence_penalty': self.presence_penalty,
            'stop_sequences': self.stop_sequences,
            'technique': self.technique,
            'template_id': self.template_id,
            'input_tokens': self.input_tokens,
            'output_tokens': self.output_tokens,
            'latency_ms': self.latency_ms,
            'estimated_cost': self.estimated_cost,
            'rating': self.rating,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
