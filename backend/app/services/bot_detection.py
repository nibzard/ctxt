from typing import Optional, List, Dict
import re
import logging

logger = logging.getLogger(__name__)

class BotDetectionService:
    """Service to detect bots and crawlers from user agent strings"""
    
    # Common bot patterns (case-insensitive)
    BOT_PATTERNS = [
        # Search engine crawlers
        r'googlebot',
        r'bingbot',
        r'slurp',  # Yahoo
        r'duckduckbot',
        r'baiduspider',
        r'yandexbot',
        r'facebookexternalhit',
        
        # SEO tool crawlers
        r'ahrefsbot',
        r'semrushbot',
        r'majestic',
        r'mj12bot',
        r'dotbot',
        r'screaming frog',
        r'spyfu',
        r'serpstatbot',
        
        # AI/LLM crawlers
        r'gptbot',
        r'chatgpt-user',
        r'oai-searchbot',
        r'claudebot',
        r'claude-searchbot', 
        r'perplexitybot',
        r'anthropic-ai',
        r'claude-web',
        r'openai',
        r'cohere-ai',
        r'cohere-training-data-crawler',
        r'google-extended',
        r'google-cloudvertexbot',
        r'meta-externalagent',
        r'bytespider',
        r'petalbot',
        r'amazonbot',
        r'youbot',
        r'diffbot',
        r'applebot-extended',
        
        # Generic bot patterns
        r'bot\b',
        r'crawler',
        r'spider',
        r'scraper',
        r'fetch',
        r'scan',
        r'monitor',
        r'check',
        r'curl',
        r'wget',
        r'http',
        r'python',
        r'requests',
        r'urllib',
        
        # Social media crawlers
        r'twitterbot',
        r'linkedinbot',
        r'whatsapp',
        r'telegrambot',
        r'slackbot',
        r'discordbot',
        
        # Archive crawlers
        r'archive\.org',
        r'wayback',
        r'ia_archiver',
        
        # Security scanners
        r'nessus',
        r'nikto',
        r'sqlmap',
        r'nmap',
    ]
    
    # Specific bot user agents for precise matching
    KNOWN_BOTS = {
        # Search engines
        'Googlebot': ['Googlebot/', 'GoogleOther'],
        'Google-Extended': ['Google-Extended/'],
        'Google-CloudVertexBot': ['Google-CloudVertexBot/'],
        'BingBot': ['bingbot/', 'BingPreview/'],
        
        # OpenAI
        'GPTBot': ['GPTBot/'],
        'ChatGPT-User': ['ChatGPT-User/', 'ChatGPT-User/2.0'],
        'OAI-SearchBot': ['OAI-SearchBot/'],
        
        # Anthropic
        'ClaudeBot': ['ClaudeBot/'],
        'Claude-SearchBot': ['Claude-SearchBot/'],
        'Anthropic-AI': ['anthropic-ai'],
        'Claude-Web': ['Claude-Web'],
        
        # Other AI companies
        'PerplexityBot': ['PerplexityBot/'],
        'Cohere-AI': ['cohere-ai', 'cohere-training-data-crawler'],
        'Meta-ExternalAgent': ['meta-externalagent', 'facebookexternalhit'],
        'ByteSpider': ['Bytespider/'],
        'PetalBot': ['PetalBot/'],
        'Amazonbot': ['Amazonbot/'],
        'YouBot': ['YouBot/'],
        'Diffbot': ['Diffbot/'],
        'AppleBot-Extended': ['Applebot-Extended/'],
        
        # SEO tools
        'AhrefsBot': ['AhrefsBot/'],
        'SemrushBot': ['SemrushBot/'],
        'MJ12Bot': ['MJ12bot/'],
        'DotBot': ['DotBot/'],
    }
    
    def __init__(self):
        # Compile regex patterns for better performance
        self.bot_regex = re.compile(
            '|'.join(f'({pattern})' for pattern in self.BOT_PATTERNS),
            re.IGNORECASE
        )
    
    def is_bot(self, user_agent: Optional[str]) -> bool:
        """
        Determine if the user agent belongs to a bot/crawler
        
        Args:
            user_agent: The User-Agent header string
            
        Returns:
            bool: True if detected as bot, False otherwise
        """
        if not user_agent:
            return False
        
        user_agent = user_agent.strip().lower()
        
        # Quick check with compiled regex
        if self.bot_regex.search(user_agent):
            return True
            
        # Check for empty or suspicious user agents
        if len(user_agent) < 10 or user_agent in ['', '-', 'null', 'none']:
            return True
            
        return False
    
    def identify_bot(self, user_agent: Optional[str]) -> Dict[str, any]:
        """
        Identify specific bot type and return detailed information
        
        Args:
            user_agent: The User-Agent header string
            
        Returns:
            Dict containing bot detection results
        """
        if not user_agent:
            return {
                'is_bot': False,
                'bot_name': None,
                'bot_type': None,
                'confidence': 0.0
            }
        
        user_agent_lower = user_agent.lower()
        
        # Check known bots first
        for bot_name, patterns in self.KNOWN_BOTS.items():
            for pattern in patterns:
                if pattern.lower() in user_agent_lower:
                    bot_type = self._classify_bot_type(bot_name)
                    return {
                        'is_bot': True,
                        'bot_name': bot_name,
                        'bot_type': bot_type,
                        'confidence': 0.95,
                        'user_agent': user_agent
                    }
        
        # Check with regex patterns
        match = self.bot_regex.search(user_agent_lower)
        if match:
            matched_pattern = match.group()
            bot_type = self._classify_bot_type(matched_pattern)
            return {
                'is_bot': True,
                'bot_name': matched_pattern.title(),
                'bot_type': bot_type,
                'confidence': 0.8,
                'user_agent': user_agent
            }
        
        # Not a bot
        return {
            'is_bot': False,
            'bot_name': None,
            'bot_type': None,
            'confidence': 0.0,
            'user_agent': user_agent
        }
    
    def _classify_bot_type(self, bot_identifier: str) -> str:
        """Classify bot into categories"""
        bot_lower = bot_identifier.lower()
        
        if any(term in bot_lower for term in ['google', 'bing', 'yahoo', 'duckduck', 'baidu', 'yandex']):
            return 'search_engine'
        elif any(term in bot_lower for term in ['ahrefs', 'semrush', 'majestic', 'mj12', 'spyfu', 'serpstat']):
            return 'seo_tool'
        elif any(term in bot_lower for term in [
            'gpt', 'chatgpt', 'oai-search', 'claude', 'perplexity', 'openai', 'anthropic', 
            'cohere', 'meta-external', 'bytespider', 'petalbot', 'amazonbot', 'youbot', 
            'diffbot', 'applebot-extended', 'google-extended', 'google-cloudvertex'
        ]):
            return 'ai_crawler'
        elif any(term in bot_lower for term in ['facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'slack', 'discord']):
            return 'social_media'
        elif any(term in bot_lower for term in ['archive', 'wayback', 'ia_archiver']):
            return 'archiver'
        elif any(term in bot_lower for term in ['nessus', 'nikto', 'sqlmap', 'nmap']):
            return 'security_scanner'
        else:
            return 'generic_bot'
    
    def should_serve_markdown(self, user_agent: Optional[str]) -> bool:
        """
        Determine if we should serve markdown content instead of HTML
        
        Args:
            user_agent: The User-Agent header string
            
        Returns:
            bool: True if should serve markdown, False for HTML
        """
        detection_result = self.identify_bot(user_agent)
        
        if not detection_result['is_bot']:
            return False
        
        # Always serve markdown to these bot types
        markdown_bot_types = {
            'search_engine',
            'seo_tool', 
            'ai_crawler',
            'archiver'
        }
        
        return detection_result['bot_type'] in markdown_bot_types
    
    def log_bot_access(self, user_agent: Optional[str], slug: str, served_markdown: bool):
        """Log bot access for monitoring"""
        detection_result = self.identify_bot(user_agent)
        
        if detection_result['is_bot']:
            logger.info(
                f"Bot access: {detection_result['bot_name']} ({detection_result['bot_type']}) "
                f"accessed /read/{slug}, served_markdown={served_markdown}, "
                f"confidence={detection_result['confidence']}"
            )

# Global instance
bot_detector = BotDetectionService()