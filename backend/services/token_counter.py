def count_tokens(text: str, model: str = 'gpt-3.5-turbo') -> int:
    """
    Count tokens in text using tiktoken.
    WHY TIKTOKEN: Even for Gemini/Groq, tiktoken gives a close-enough estimate.
    Token counts aren't exact across providers but are within ~10%.
    Returns approximate token count.
    """
    try:
        import tiktoken
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:
        return len(text) // 4