"""Context stack service for managing context collections."""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.base import CRUDService
from app.models import ContextStack
from app.core.exceptions import ResourceNotFoundError
import json
import uuid


class ContextStackService(CRUDService[ContextStack]):
    """Service for managing context stacks."""
    
    def __init__(self):
        super().__init__(ContextStack)
    
    def create_context_stack(
        self, 
        db: Session, 
        user_id: str,
        name: str,
        description: Optional[str],
        blocks: List[Dict[str, Any]],
        is_template: bool = False,
        is_public: bool = False
    ) -> ContextStack:
        """Create a new context stack."""
        context_stack_data = {
            "id": uuid.uuid4(),
            "user_id": user_id,
            "name": name,
            "description": description,
            "blocks": blocks,
            "is_template": is_template,
            "is_public": is_public,
            "use_count": 0
        }
        
        context_stack = self.create(db, context_stack_data)
        self.logger.info(f"Context stack created: {name} by user {user_id}")
        
        return context_stack
    
    def get_user_context_stacks(
        self, 
        db: Session, 
        user_id: str,
        search: Optional[str] = None,
        is_template: Optional[bool] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[ContextStack]:
        """Get context stacks for a user with optional filters."""
        query = db.query(ContextStack).filter(ContextStack.user_id == user_id)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                ContextStack.name.ilike(search_pattern) |
                ContextStack.description.ilike(search_pattern)
            )
        
        if is_template is not None:
            query = query.filter(ContextStack.is_template == is_template)
        
        return query.order_by(
            ContextStack.created_at.desc()
        ).offset(offset).limit(limit).all()
    
    def get_public_context_stacks(
        self, 
        db: Session,
        limit: int = 20,
        offset: int = 0
    ) -> List[ContextStack]:
        """Get public context stacks."""
        return db.query(ContextStack).filter(
            ContextStack.is_public == True
        ).order_by(
            ContextStack.use_count.desc(),
            ContextStack.created_at.desc()
        ).offset(offset).limit(limit).all()
    
    def get_context_stack_with_access_check(
        self, 
        db: Session, 
        stack_id: str, 
        user_id: Optional[str] = None
    ) -> ContextStack:
        """Get context stack with access control."""
        query = db.query(ContextStack).filter(ContextStack.id == stack_id)
        
        # If not authenticated, only show public stacks
        if not user_id:
            query = query.filter(ContextStack.is_public == True)
        else:
            # Show user's own stacks or public ones
            query = query.filter(
                (ContextStack.user_id == user_id) |
                (ContextStack.is_public == True)
            )
        
        context_stack = query.first()
        
        if not context_stack:
            raise ResourceNotFoundError("Context stack", stack_id)
        
        return context_stack
    
    def update_context_stack(
        self, 
        db: Session, 
        stack_id: str, 
        user_id: str,
        updates: Dict[str, Any]
    ) -> ContextStack:
        """Update a context stack (user must own it)."""
        context_stack = db.query(ContextStack).filter(
            ContextStack.id == stack_id,
            ContextStack.user_id == user_id
        ).first()
        
        if not context_stack:
            raise ResourceNotFoundError("Context stack", stack_id)
        
        # Update fields
        for key, value in updates.items():
            if hasattr(context_stack, key) and key not in ['id', 'user_id', 'created_at']:
                setattr(context_stack, key, value)
        
        db.commit()
        db.refresh(context_stack)
        
        self.logger.info(f"Context stack updated: {stack_id}")
        return context_stack
    
    def delete_context_stack(self, db: Session, stack_id: str, user_id: str) -> bool:
        """Delete a context stack (user must own it)."""
        context_stack = db.query(ContextStack).filter(
            ContextStack.id == stack_id,
            ContextStack.user_id == user_id
        ).first()
        
        if not context_stack:
            return False
        
        db.delete(context_stack)
        db.commit()
        
        self.logger.info(f"Context stack deleted: {stack_id}")
        return True
    
    def increment_use_count(self, db: Session, stack_id: str) -> None:
        """Increment the use count for a context stack."""
        from datetime import datetime
        
        context_stack = db.query(ContextStack).filter(ContextStack.id == stack_id).first()
        if context_stack:
            context_stack.use_count += 1
            context_stack.last_used_at = datetime.utcnow()
            db.commit()
    
    def export_context_stack(
        self, 
        db: Session, 
        stack_id: str, 
        user_id: Optional[str],
        format: str = "xml",
        custom_wrapper: Optional[str] = None,
        include_sources: bool = True
    ) -> Dict[str, Any]:
        """Export context stack in various formats."""
        context_stack = self.get_context_stack_with_access_check(db, stack_id, user_id)
        
        # Increment use count
        self.increment_use_count(db, stack_id)
        
        blocks = context_stack.blocks
        
        if format == "xml":
            content = self._export_as_xml(context_stack, blocks, custom_wrapper, include_sources)
        elif format == "json":
            content = self._export_as_json(context_stack, blocks, include_sources)
        else:  # markdown
            content = self._export_as_markdown(context_stack, blocks, include_sources)
        
        return {
            "content": content,
            "format": format,
            "name": context_stack.name,
            "exported_at": datetime.utcnow().isoformat()
        }
    
    def _export_as_xml(
        self, 
        stack: ContextStack, 
        blocks: List[Dict[str, Any]], 
        custom_wrapper: Optional[str],
        include_sources: bool
    ) -> str:
        """Export as XML format."""
        if custom_wrapper:
            content = f"<{custom_wrapper}>"
        else:
            content = "<context>"
        
        if stack.description:
            content += f"\\n  <description>{stack.description}</description>"
            
        for i, block in enumerate(blocks):
            if block.get('type') == 'url':
                attrs = f'url="{block.get("url", "")}" title="{block.get("title", "Untitled")}"' if include_sources else ""
                content += f"\\n  <source_{i+1} {attrs}>\\n    {block.get('content', '')}\\n  </source_{i+1}>"
            else:
                content += f"\\n  <text_{i+1}>\\n    {block.get('content', '')}\\n  </text_{i+1}>"
        
        if custom_wrapper:
            content += f"\\n</{custom_wrapper}>"
        else:
            content += "\\n</context>"
            
        return content
    
    def _export_as_json(
        self, 
        stack: ContextStack, 
        blocks: List[Dict[str, Any]], 
        include_sources: bool
    ) -> str:
        """Export as JSON format."""
        data = {
            "name": stack.name,
            "description": stack.description,
            "blocks": blocks if include_sources else [{"content": b.get("content", "")} for b in blocks],
            "metadata": {
                "created_at": stack.created_at.isoformat(),
                "use_count": stack.use_count,
                "is_template": stack.is_template
            }
        }
        
        return json.dumps(data, indent=2)
    
    def _export_as_markdown(
        self, 
        stack: ContextStack, 
        blocks: List[Dict[str, Any]], 
        include_sources: bool
    ) -> str:
        """Export as Markdown format."""
        content_lines = [
            f"# {stack.name}",
            ""
        ]
        
        if stack.description:
            content_lines.extend([
                stack.description,
                ""
            ])
        
        for i, block in enumerate(blocks):
            if block.get('type') == 'url' and include_sources:
                content_lines.extend([
                    f"## Source {i+1}: {block.get('title', 'Untitled')}",
                    f"**URL:** {block.get('url', '')}",
                    "",
                    block.get('content', ''),
                    "",
                    "---",
                    ""
                ])
            else:
                content_lines.extend([
                    f"## Block {i+1}",
                    "",
                    block.get('content', ''),
                    "",
                    "---",
                    ""
                ])
        
        return "\\n".join(content_lines)