
import time
import os
from config import Config


def call_llm(system_prompt: str, user_prompt: str, params: dict) -> dict:
    """
    Master function that routes to the right LLM provider.
    
    Args:
        system_prompt: Instructions for the AI's persona/behavior
        user_prompt: The actual user question/task
        params: Dict with temperature, max_tokens, top_p, etc.
    
    Returns:
        Dict with output text and metrics
    """
    provider = params.get('provider', 'groq').lower()
    
    # Only Groq is available (no Gemini)
    return _call_groq(system_prompt, user_prompt, params)


def _call_groq(system_prompt: str, user_prompt: str, params: dict) -> dict:
    """
    Call Groq API (extremely fast inference, free tier).
    
    WHY GROQ: Uses custom LPU chips — responses are nearly instant.
    Great for showing users the effect of parameters quickly.
    """
    from groq import Groq
    
    client = Groq(api_key=Config.GROQ_API_KEY)
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    
    model_name = params.get('model', 'llama-3.1-8b-instant')
    
    start_time = time.time()
    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=float(params.get('temperature', 0.7)),
        max_tokens=int(params.get('max_tokens', 1024)),
        top_p=float(params.get('top_p', 0.9)),
        frequency_penalty=float(params.get('frequency_penalty', 0.0)),
        presence_penalty=float(params.get('presence_penalty', 0.0)),
        stop=params.get('stop_sequences') or None
    )
    latency_ms = int((time.time() - start_time) * 1000)
    
    output_text = response.choices[0].message.content
    
    # Groq returns actual token counts
    input_tokens = response.usage.prompt_tokens
    output_tokens = response.usage.completion_tokens
    
    # Groq Llama3 pricing: ~$0.05 per 1M tokens (approx)
    estimated_cost = (input_tokens + output_tokens) * 0.00000005
    
    return {
        'output': output_text,
        'provider': 'groq',
        'model': model_name,
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
        'latency_ms': latency_ms,
        'estimated_cost': round(estimated_cost, 6)
    }