"""Base service class and interfaces."""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.core.exceptions import DatabaseError
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class BaseService(ABC):
    """Abstract base class for all services."""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def _handle_db_error(self, error: Exception, operation: str) -> None:
        """Handle database errors consistently."""
        self.logger.error(f"Database error in {operation}: {str(error)}")
        raise DatabaseError(f"Failed to {operation}", operation)


class CRUDService(BaseService, Generic[T]):
    """Base CRUD service for database operations."""
    
    def __init__(self, model_class: type):
        super().__init__()
        self.model_class = model_class
    
    def create(self, db: Session, data: Dict[str, Any]) -> T:
        """Create a new record."""
        try:
            instance = self.model_class(**data)
            db.add(instance)
            db.commit()
            db.refresh(instance)
            
            self.logger.info(f"Created {self.model_class.__name__} with ID: {instance.id}")
            return instance
        except Exception as e:
            db.rollback()
            self._handle_db_error(e, f"create {self.model_class.__name__}")
    
    def get_by_id(self, db: Session, record_id: str) -> Optional[T]:
        """Get record by ID."""
        try:
            return db.query(self.model_class).filter(self.model_class.id == record_id).first()
        except Exception as e:
            self._handle_db_error(e, f"get {self.model_class.__name__} by ID")
    
    def get_all(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """Get all records with optional filters."""
        try:
            query = db.query(self.model_class)
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model_class, key):
                        query = query.filter(getattr(self.model_class, key) == value)
            
            return query.offset(skip).limit(limit).all()
        except Exception as e:
            self._handle_db_error(e, f"get all {self.model_class.__name__}")
    
    def update(self, db: Session, record_id: str, data: Dict[str, Any]) -> Optional[T]:
        """Update a record."""
        try:
            instance = self.get_by_id(db, record_id)
            if not instance:
                return None
            
            # Update fields
            for key, value in data.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            
            db.commit()
            db.refresh(instance)
            
            self.logger.info(f"Updated {self.model_class.__name__} with ID: {record_id}")
            return instance
        except Exception as e:
            db.rollback()
            self._handle_db_error(e, f"update {self.model_class.__name__}")
    
    def delete(self, db: Session, record_id: str) -> bool:
        """Delete a record."""
        try:
            instance = self.get_by_id(db, record_id)
            if not instance:
                return False
            
            db.delete(instance)
            db.commit()
            
            self.logger.info(f"Deleted {self.model_class.__name__} with ID: {record_id}")
            return True
        except Exception as e:
            db.rollback()
            self._handle_db_error(e, f"delete {self.model_class.__name__}")
    
    def count(self, db: Session, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters."""
        try:
            query = db.query(self.model_class)
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if hasattr(self.model_class, key):
                        query = query.filter(getattr(self.model_class, key) == value)
            
            return query.count()
        except Exception as e:
            self._handle_db_error(e, f"count {self.model_class.__name__}")


class ExternalService(BaseService):
    """Base class for external service integrations."""
    
    def __init__(self, service_name: str, base_url: Optional[str] = None):
        super().__init__()
        self.service_name = service_name
        self.base_url = base_url
    
    def _handle_external_error(self, error: Exception, operation: str) -> None:
        """Handle external service errors consistently."""
        from app.core.exceptions import ExternalServiceError
        
        self.logger.error(f"{self.service_name} error in {operation}: {str(error)}")
        raise ExternalServiceError(self.service_name, str(error))