import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_ENV') == 'development'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database: Handle both SQLite (local) and PostgreSQL (production)
    db_url = os.getenv('DATABASE_URL', 'sqlite:///playground.db')
    if db_url and db_url.startswith('postgres://'):
        # Render uses postgres://, but SQLAlchemy needs postgresql://
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = db_url
    
    # LLM API Key (Groq only)
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    
    # Default LLM parameters
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = 1024
    DEFAULT_TOP_P = 0.9
    
    # Port
    PORT = int(os.getenv('PORT', 5000))