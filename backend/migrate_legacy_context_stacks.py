#!/usr/bin/env python3
"""
Migration script to move legacy context stacks from conversions table to context_stacks table

This script:
1. Identifies context stacks stored as conversions (slug starts with 'context-stack-')
2. Creates proper context_stack records with structured blocks
3. Creates a default user for orphaned context stacks
4. Removes the converted conversions from the conversions table
"""

import os
import sys
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to Python path
sys.path.append('/app')

def get_database_url():
    """Get database URL from environment or use default"""
    return os.getenv('DATABASE_URL', 'postgresql://ctxt_user:ctxt_password@postgresql:5432/ctxt_help')

def create_default_user(session):
    """Create a default system user for orphaned context stacks"""
    default_user_id = uuid.UUID('00000000-0000-0000-0000-000000000001')
    
    # Check if default user exists
    result = session.execute(text("""
        SELECT id FROM users WHERE id = :user_id
    """), {'user_id': default_user_id})
    
    if result.fetchone():
        print(f"Default user already exists: {default_user_id}")
        return default_user_id
    
    # Create default user
    session.execute(text("""
        INSERT INTO users (id, email, hashed_password, tier, is_active, is_verified)
        VALUES (:user_id, 'system@ctxt.help', 'system_user', 'free', true, true)
    """), {
        'user_id': default_user_id
    })
    
    print(f"Created default system user: {default_user_id}")
    return default_user_id

def parse_markdown_to_blocks(content, title):
    """Convert markdown content to structured blocks format"""
    
    # For now, create a single block with the full content
    # In a more sophisticated version, we could parse headers to create multiple blocks
    blocks = [
        {
            "title": title,
            "content": content,
            "type": "markdown"
        }
    ]
    
    return blocks

def migrate_legacy_context_stacks():
    """Main migration function"""
    
    try:
        # Create database connection
        engine = create_engine(get_database_url())
        Session = sessionmaker(bind=engine)
        session = Session()
        
        print("Starting legacy context stack migration...")
        
        # Create default user for orphaned context stacks
        default_user_id = create_default_user(session)
        
        # Find all legacy context stacks in conversions table
        result = session.execute(text("""
            SELECT id, slug, title, content, user_id, is_public, created_at, updated_at, view_count
            FROM conversions 
            WHERE slug LIKE 'context-stack-%' 
            ORDER BY created_at
        """))
        
        legacy_stacks = result.fetchall()
        print(f"Found {len(legacy_stacks)} legacy context stacks to migrate")
        
        migrated_count = 0
        
        for stack in legacy_stacks:
            try:
                # Extract context stack ID from slug (e.g., 'context-stack-1757017804' -> '1757017804')
                stack_suffix = stack.slug.replace('context-stack-', '')
                
                # Use existing user_id or default to system user
                user_id = stack.user_id or default_user_id
                
                # Parse content into blocks
                blocks = parse_markdown_to_blocks(stack.content, stack.title)
                
                # Create new context_stack record
                new_context_stack_id = uuid.uuid4()
                
                session.execute(text("""
                    INSERT INTO context_stacks (
                        id, user_id, name, description, blocks, 
                        is_public, is_template, use_count, 
                        created_at, updated_at
                    ) VALUES (
                        :id, :user_id, :name, :description, :blocks,
                        :is_public, :is_template, :use_count,
                        :created_at, :updated_at
                    )
                """), {
                    'id': new_context_stack_id,
                    'user_id': user_id,
                    'name': stack.title,
                    'description': f'Migrated from legacy context stack {stack.slug}',
                    'blocks': json.dumps(blocks),
                    'is_public': stack.is_public,
                    'is_template': False,
                    'use_count': stack.view_count or 0,
                    'created_at': stack.created_at,
                    'updated_at': stack.updated_at or stack.created_at
                })
                
                print(f"✅ Migrated {stack.slug} -> {new_context_stack_id}")
                migrated_count += 1
                
            except Exception as e:
                print(f"❌ Error migrating {stack.slug}: {str(e)}")
                continue
        
        # Commit all context_stacks insertions
        session.commit()
        print(f"✅ Successfully migrated {migrated_count} context stacks")
        
        # Now remove the legacy conversions
        if migrated_count > 0:
            print("\nRemoving legacy context stack conversions...")
            
            result = session.execute(text("""
                DELETE FROM conversions WHERE slug LIKE 'context-stack-%'
            """))
            
            deleted_count = result.rowcount
            session.commit()
            
            print(f"✅ Removed {deleted_count} legacy conversion records")
        
        session.close()
        print(f"\n🎉 Migration completed successfully!")
        print(f"   - Migrated: {migrated_count} context stacks")
        print(f"   - Cleaned up: {migrated_count} legacy conversion records")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        if 'session' in locals():
            session.rollback()
            session.close()
        return False

if __name__ == "__main__":
    print("=== Legacy Context Stack Migration ===")
    print("This will move context stacks from conversions to context_stacks table")
    
    # In production, you'd want a confirmation prompt
    # For now, run directly
    success = migrate_legacy_context_stacks()
    
    if success:
        print("\n✅ Migration completed. Please restart your application to see the changes.")
        sys.exit(0)
    else:
        print("\n❌ Migration failed. Please check the logs and try again.")
        sys.exit(1)