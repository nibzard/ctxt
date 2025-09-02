from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models import ContextStack, User
from app.schemas import (
    ContextStackCreate,
    ContextStack as ContextStackSchema,
    ContextStackExport
)
from app.core.auth import get_current_active_user
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=ContextStackSchema)
async def create_context_stack(
    stack_data: ContextStackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new context stack"""
    try:
        context_stack = ContextStack(
            id=uuid.uuid4(),
            user_id=current_user.id,
            name=stack_data.name,
            description=stack_data.description,
            blocks=stack_data.blocks,
            is_template=stack_data.is_template,
            is_public=stack_data.is_public,
            use_count=0
        )
        
        db.add(context_stack)
        db.commit()
        db.refresh(context_stack)
        
        logger.info(f"Context stack created: {stack_data.name} by user {current_user.email}")
        
        return context_stack
        
    except Exception as e:
        logger.error(f"Error creating context stack: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create context stack: {str(e)}"
        )

@router.get("/", response_model=List[ContextStackSchema])
async def list_context_stacks(
    search: Optional[str] = None,
    is_template: Optional[bool] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List user's context stacks"""
    query = db.query(ContextStack).filter(ContextStack.user_id == current_user.id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            ContextStack.name.ilike(search_pattern) |
            ContextStack.description.ilike(search_pattern)
        )
    
    if is_template is not None:
        query = query.filter(ContextStack.is_template == is_template)
    
    context_stacks = query.order_by(
        ContextStack.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return context_stacks

@router.get("/{stack_id}", response_model=ContextStackSchema)
async def get_context_stack(
    stack_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get a specific context stack"""
    query = db.query(ContextStack).filter(ContextStack.id == stack_id)
    
    # If not authenticated, only show public stacks
    if not current_user:
        query = query.filter(ContextStack.is_public == True)
    else:
        # Show user's own stacks or public ones
        query = query.filter(
            (ContextStack.user_id == current_user.id) |
            (ContextStack.is_public == True)
        )
    
    context_stack = query.first()
    
    if not context_stack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context stack not found"
        )
    
    # Increment use count
    context_stack.use_count += 1
    context_stack.last_used_at = db.func.now()
    db.commit()
    
    return context_stack

@router.put("/{stack_id}", response_model=ContextStackSchema)
async def update_context_stack(
    stack_id: str,
    stack_data: ContextStackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a context stack"""
    context_stack = db.query(ContextStack).filter(
        ContextStack.id == stack_id,
        ContextStack.user_id == current_user.id
    ).first()
    
    if not context_stack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context stack not found"
        )
    
    # Update fields
    context_stack.name = stack_data.name
    context_stack.description = stack_data.description
    context_stack.blocks = stack_data.blocks
    context_stack.is_template = stack_data.is_template
    context_stack.is_public = stack_data.is_public
    
    db.commit()
    db.refresh(context_stack)
    
    return context_stack

@router.delete("/{stack_id}")
async def delete_context_stack(
    stack_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a context stack"""
    context_stack = db.query(ContextStack).filter(
        ContextStack.id == stack_id,
        ContextStack.user_id == current_user.id
    ).first()
    
    if not context_stack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context stack not found"
        )
    
    db.delete(context_stack)
    db.commit()
    
    return {"message": "Context stack deleted successfully"}

@router.post("/{stack_id}/export")
async def export_context_stack(
    stack_id: str,
    export_options: ContextStackExport,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Export context stack in various formats"""
    query = db.query(ContextStack).filter(ContextStack.id == stack_id)
    
    # If not authenticated, only show public stacks
    if not current_user:
        query = query.filter(ContextStack.is_public == True)
    else:
        query = query.filter(
            (ContextStack.user_id == current_user.id) |
            (ContextStack.is_public == True)
        )
    
    context_stack = query.first()
    
    if not context_stack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Context stack not found"
        )
    
    # Format based on export options
    blocks = context_stack.blocks
    
    if export_options.format == "xml":
        if export_options.custom_wrapper:
            content = f"<{export_options.custom_wrapper}>"
        else:
            content = "<context>"
            
        for i, block in enumerate(blocks):
            if block.get('type') == 'url':
                content += f"\n  <source_{i+1} url=\"{block.get('url', '')}\" title=\"{block.get('title', 'Untitled')}\">\n    {block.get('content', '')}\n  </source_{i+1}>"
            else:
                content += f"\n  <text_{i+1}>\n    {block.get('content', '')}\n  </text_{i+1}>"
        
        if export_options.custom_wrapper:
            content += f"\n</{export_options.custom_wrapper}>"
        else:
            content += "\n</context>"
            
    elif export_options.format == "json":
        import json
        content = json.dumps({
            "name": context_stack.name,
            "description": context_stack.description,
            "blocks": blocks,
            "metadata": {
                "created_at": context_stack.created_at.isoformat(),
                "use_count": context_stack.use_count
            }
        }, indent=2)
        
    else:  # markdown
        content_lines = [
            f"# {context_stack.name}",
            ""
        ]
        
        if context_stack.description:
            content_lines.extend([
                context_stack.description,
                ""
            ])
        
        for i, block in enumerate(blocks):
            if block.get('type') == 'url':
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
                    f"## Text Block {i+1}",
                    "",
                    block.get('content', ''),
                    "",
                    "---",
                    ""
                ])
        
        content = "\\n".join(content_lines)
    
    # Increment use count
    context_stack.use_count += 1
    context_stack.last_used_at = db.func.now()
    db.commit()
    
    return {
        "content": content,
        "format": export_options.format,
        "name": context_stack.name,
        "exported_at": db.func.now()
    }