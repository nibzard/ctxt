# ABOUTME: Token counting service using OpenAI's tiktoken library
# ABOUTME: Provides accurate token counts for LLM context usage estimation

import tiktoken
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class TokenCounter:
    """Service for counting tokens using tiktoken library"""
    
    def __init__(self, encoding_name: str = "cl100k_base"):
        """
        Initialize token counter with specified encoding
        
        Args:
            encoding_name: The tiktoken encoding to use. 
                          "cl100k_base" is compatible with GPT-4, GPT-3.5-turbo, and Claude
        """
        try:
            self.encoding = tiktoken.get_encoding(encoding_name)
            self.encoding_name = encoding_name
            logger.info(f"TokenCounter initialized with encoding: {encoding_name}")
        except Exception as e:
            logger.error(f"Failed to initialize tiktoken encoding '{encoding_name}': {e}")
            raise
    
    def count_tokens(self, text: str) -> int:
        """
        Count tokens in the given text
        
        Args:
            text: The text to count tokens for
            
        Returns:
            Number of tokens in the text
        """
        if not text or not isinstance(text, str):
            return 0
            
        try:
            tokens = self.encoding.encode(text)
            token_count = len(tokens)
            logger.debug(f"Counted {token_count} tokens for text of length {len(text)} characters")
            return token_count
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            # Fallback to rough estimate: ~4 characters per token on average
            return max(1, len(text) // 4)
    
    def count_tokens_batch(self, texts: list[str]) -> list[int]:
        """
        Count tokens for multiple texts efficiently
        
        Args:
            texts: List of texts to count tokens for
            
        Returns:
            List of token counts corresponding to each text
        """
        return [self.count_tokens(text) for text in texts]
    
    def get_encoding_name(self) -> str:
        """Get the name of the current encoding"""
        return self.encoding_name
    
    @classmethod
    def estimate_context_usage(cls, token_count: int, model: str = "gpt-4") -> dict:
        """
        Estimate context usage for different models
        
        Args:
            token_count: Number of tokens
            model: Model name for context limit lookup
            
        Returns:
            Dictionary with usage information
        """
        # Common model context limits
        context_limits = {
            "gpt-4": 8192,
            "gpt-4-32k": 32768,
            "gpt-4-turbo": 128000,
            "gpt-3.5-turbo": 4096,
            "gpt-3.5-turbo-16k": 16384,
            "claude-3-sonnet": 200000,
            "claude-3-opus": 200000,
            "claude-3-haiku": 200000,
        }
        
        limit = context_limits.get(model, 8192)  # Default to GPT-4 limit
        usage_percentage = (token_count / limit) * 100
        
        return {
            "token_count": token_count,
            "model": model,
            "context_limit": limit,
            "usage_percentage": round(usage_percentage, 1),
            "remaining_tokens": max(0, limit - token_count),
            "can_fit": token_count <= limit
        }

# Global instance
token_counter = TokenCounter()

def count_tokens(text: str) -> int:
    """Convenience function to count tokens"""
    return token_counter.count_tokens(text)

def count_tokens_batch(texts: list[str]) -> list[int]:
    """Convenience function to count tokens for multiple texts"""
    return token_counter.count_tokens_batch(texts)