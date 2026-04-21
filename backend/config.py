import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_ENV') == 'development'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database: Use SQLite (compatible with Python 3.14)
    SQLALCHEMY_DATABASE_URI = 'sqlite:///playground.db'
    
    # LLM API Key (Groq only)
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    
    # Default LLM parameters
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = 1024
    DEFAULT_TOP_P = 0.9
    
    # Port
    PORT = int(os.getenv('PORT', 5000))