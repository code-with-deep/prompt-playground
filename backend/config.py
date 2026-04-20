import os
from dotenv import load_dotenv
load_dotenv()
class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_ENV') == 'development'
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///playground.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = 1024
    DEFAULT_TOP_P = 0.9
    PORT = int(os.getenv('FLASK_PORT', 5000))