"""Advanced configuration management system."""

import os
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
from app.core.config import settings
from app.core.exceptions import ConfigurationError
import logging

logger = logging.getLogger(__name__)


class ConfigurationManager:
    """Advanced configuration manager for different environments."""
    
    def __init__(self):
        self.environment = settings.environment
        self._config_cache: Dict[str, Any] = {}
        self._load_configuration()
    
    def _load_configuration(self) -> None:
        """Load configuration based on environment."""
        try:
            # Load base configuration
            self._load_base_config()
            
            # Load environment-specific configuration
            self._load_environment_config()
            
            # Validate critical configurations
            self._validate_configuration()
            
            logger.info(f"Configuration loaded for environment: {self.environment}")
            
        except Exception as e:
            logger.error(f"Failed to load configuration: {str(e)}")
            raise ConfigurationError(f"Configuration loading failed: {str(e)}")
    
    def _load_base_config(self) -> None:
        """Load base configuration settings."""
        self._config_cache.update({
            "app": {
                "name": settings.app_name,
                "version": settings.version,
                "debug": settings.debug,
                "environment": settings.environment
            },
            "database": {
                "url": settings.database_url,
                "sql_debug": settings.sql_debug
            },
            "redis": {
                "url": settings.redis_url
            },
            "auth": {
                "jwt_secret_key": settings.jwt_secret_key,
                "jwt_algorithm": settings.jwt_algorithm,
                "jwt_access_token_expire_minutes": settings.jwt_access_token_expire_minutes,
                "jwt_refresh_token_expire_days": settings.jwt_refresh_token_expire_days
            },
            "cors": {
                "allowed_origins": settings.allowed_origins
            },
            "rate_limiting": {
                "free_daily": settings.rate_limit_free_daily,
                "power_daily": settings.rate_limit_power_daily,
                "pro_daily": settings.rate_limit_pro_daily
            },
            "external_apis": {
                "jina_reader_base_url": settings.jina_reader_base_url,
                "jina_fallback_enabled": settings.jina_fallback_enabled
            },
            "features": {
                "mcp_server_enabled": settings.mcp_server_enabled,
                "seo_pages_enabled": settings.seo_pages_enabled,
                "analytics_enabled": settings.analytics_enabled
            },
            "payment": {
                "polar_access_token": settings.polar_access_token,
                "polar_webhook_secret": settings.polar_webhook_secret,
                "polar_organization_id": settings.polar_organization_id,
                "polar_success_url": settings.polar_success_url,
                "polar_power_product_id": settings.polar_power_product_id,
                "polar_pro_product_id": settings.polar_pro_product_id,
                "polar_enterprise_product_id": settings.polar_enterprise_product_id
            },
            "email": {
                "smtp_host": settings.smtp_host,
                "smtp_port": settings.smtp_port,
                "smtp_user": settings.smtp_user,
                "smtp_password": settings.smtp_password,
                "from_email": settings.from_email
            },
            "monitoring": {
                "sentry_dsn": settings.sentry_dsn
            }
        })
    
    def _load_environment_config(self) -> None:
        """Load environment-specific configuration."""
        config_file = f"config/{self.environment}.json"
        
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    env_config = json.load(f)
                    self._merge_config(self._config_cache, env_config)
                    logger.info(f"Loaded environment config from {config_file}")
            except Exception as e:
                logger.warning(f"Failed to load environment config: {str(e)}")
    
    def _merge_config(self, base: Dict[str, Any], override: Dict[str, Any]) -> None:
        """Recursively merge configuration dictionaries."""
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._merge_config(base[key], value)
            else:
                base[key] = value
    
    def _validate_configuration(self) -> None:
        """Validate critical configuration settings."""
        critical_configs = []
        
        # Validate JWT secret key
        jwt_secret = self.get("auth.jwt_secret_key")
        if not jwt_secret or len(jwt_secret) < 32:
            critical_configs.append("JWT secret key must be at least 32 characters")
        
        # Validate database URL
        if not self.get("database.url"):
            critical_configs.append("Database URL is required")
        
        # Validate Redis URL
        if not self.get("redis.url"):
            critical_configs.append("Redis URL is required")
        
        # Environment-specific validations
        if self.environment == "production":
            # Production-specific validations
            if self.get("app.debug", False):
                logger.warning("Debug mode is enabled in production")
            
            if not self.get("monitoring.sentry_dsn"):
                logger.warning("Sentry DSN not configured for production")
            
            # Check if secure protocols are used
            db_url = self.get("database.url", "")
            if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
                logger.warning("Consider using asyncpg for better performance in production")
        
        if critical_configs:
            raise ConfigurationError(
                f"Critical configuration errors: {'; '.join(critical_configs)}"
            )
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation."""
        keys = key.split('.')
        value = self._config_cache
        
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key: str, value: Any) -> None:
        """Set configuration value using dot notation."""
        keys = key.split('.')
        config = self._config_cache
        
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        config[keys[-1]] = value
    
    def get_database_config(self) -> Dict[str, Any]:
        """Get database configuration."""
        return {
            "url": self.get("database.url"),
            "echo": self.get("database.sql_debug", False),
            "pool_size": self.get("database.pool_size", 5),
            "max_overflow": self.get("database.max_overflow", 10),
            "pool_timeout": self.get("database.pool_timeout", 30)
        }
    
    def get_redis_config(self) -> Dict[str, Any]:
        """Get Redis configuration."""
        return {
            "url": self.get("redis.url"),
            "decode_responses": True,
            "socket_timeout": self.get("redis.socket_timeout", 5),
            "socket_connect_timeout": self.get("redis.socket_connect_timeout", 5),
            "retry_on_timeout": True
        }
    
    def get_cors_config(self) -> Dict[str, Any]:
        """Get CORS configuration."""
        return {
            "allow_origins": self.get("cors.allowed_origins", []),
            "allow_credentials": self.get("cors.allow_credentials", True),
            "allow_methods": self.get("cors.allow_methods", ["*"]),
            "allow_headers": self.get("cors.allow_headers", ["*"]),
            "max_age": self.get("cors.max_age", 3600)
        }
    
    def get_rate_limit_config(self) -> Dict[str, Any]:
        """Get rate limiting configuration."""
        return {
            "free_daily": self.get("rate_limiting.free_daily", 5),
            "power_daily": self.get("rate_limiting.power_daily", "unlimited"),
            "pro_daily": self.get("rate_limiting.pro_daily", "unlimited"),
            "enterprise_daily": self.get("rate_limiting.enterprise_daily", "unlimited"),
            "window_size": self.get("rate_limiting.window_size", 86400)  # 24 hours
        }
    
    def get_feature_flags(self) -> Dict[str, bool]:
        """Get feature flags configuration."""
        return {
            "mcp_server_enabled": self.get("features.mcp_server_enabled", True),
            "seo_pages_enabled": self.get("features.seo_pages_enabled", True),
            "analytics_enabled": self.get("features.analytics_enabled", True),
            "payment_enabled": bool(self.get("payment.polar_access_token")),
            "email_enabled": bool(self.get("email.smtp_host"))
        }
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment == "development"
    
    def is_testing(self) -> bool:
        """Check if running in testing environment."""
        return self.environment == "testing"
    
    def export_config(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Export configuration (optionally excluding sensitive data)."""
        config = self._config_cache.copy()
        
        if not include_sensitive:
            # Remove sensitive data
            sensitive_keys = [
                "auth.jwt_secret_key",
                "database.url",
                "payment.polar_access_token",
                "payment.polar_webhook_secret",
                "email.smtp_password",
                "monitoring.sentry_dsn"
            ]
            
            for key in sensitive_keys:
                keys = key.split('.')
                obj = config
                try:
                    for k in keys[:-1]:
                        obj = obj[k]
                    if keys[-1] in obj:
                        obj[keys[-1]] = "***REDACTED***"
                except (KeyError, TypeError):
                    continue
        
        return config
    
    def reload(self) -> None:
        """Reload configuration from files and environment."""
        self._config_cache = {}
        self._load_configuration()
        logger.info("Configuration reloaded")


# Global configuration manager instance
config_manager = ConfigurationManager()