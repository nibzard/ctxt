#!/bin/bash

# ctxt.help Development Environment Setup Script

set -e  # Exit on any error

echo "🚀 Setting up ctxt.help development environment..."

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is required but not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is required but not installed"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
}

# Setup environment file
setup_env() {
    echo "📝 Setting up environment variables..."
    
    if [ ! -f .env ]; then
        echo "Creating .env file from template..."
        cp .env.example .env
        echo "✅ Created .env file - please review and update values as needed"
    else
        echo "✅ .env file already exists"
    fi
}

# Start database services
start_database() {
    echo "🗄️  Starting database services..."
    
    # Start only PostgreSQL and Redis first
    docker-compose up -d postgresql redis
    
    echo "⏳ Waiting for databases to be ready..."
    
    # Wait for PostgreSQL
    until docker-compose exec postgresql pg_isready -U ctxt_user -d ctxt_help; do
        echo "Waiting for PostgreSQL..."
        sleep 2
    done
    
    # Wait for Redis
    until docker-compose exec redis redis-cli ping; do
        echo "Waiting for Redis..."
        sleep 2
    done
    
    echo "✅ Databases are ready"
}

# Setup backend
setup_backend() {
    echo "🐍 Setting up backend..."
    
    if [ ! -d "backend/venv" ]; then
        echo "Creating Python virtual environment..."
        cd backend
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        cd ..
        echo "✅ Backend virtual environment created"
    else
        echo "✅ Backend virtual environment already exists"
    fi
    
    # Initialize database
    echo "📊 Initializing database..."
    cd backend
    source venv/bin/activate
    
    # Create basic database initialization script
    python -c "
from app.db.database import create_database
from app.models import Base

print('Creating database tables...')
create_database()
print('Database tables created successfully!')
"
    cd ..
    echo "✅ Database initialized"
}

# Setup frontend (without Node.js version issues)
setup_frontend() {
    echo "⚛️  Setting up frontend..."
    
    if [ ! -d "frontend/node_modules" ]; then
        echo "Installing frontend dependencies..."
        cd frontend
        
        # Use npm ci if package-lock.json exists, otherwise npm install
        if [ -f "package-lock.json" ]; then
            npm ci || npm install
        else
            npm install
        fi
        
        # Setup Tailwind CSS manually if needed
        echo "Setting up Tailwind CSS..."
        npx tailwindcss init -p 2>/dev/null || echo "Tailwind already configured"
        
        cd ..
        echo "✅ Frontend dependencies installed"
    else
        echo "✅ Frontend dependencies already installed"
    fi
}

# Setup MCP server
setup_mcp() {
    echo "🤖 Setting up MCP server..."
    
    if [ ! -d "mcp-server/node_modules" ]; then
        echo "Installing MCP server dependencies..."
        cd mcp-server
        npm install || echo "⚠️  MCP server dependencies installation had issues (will retry later)"
        cd ..
    else
        echo "✅ MCP server dependencies already installed"
    fi
}

# Create development scripts
create_scripts() {
    echo "📜 Creating development scripts..."
    
    # Backend start script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
cd backend
source venv/bin/activate
export DATABASE_URL=postgresql://ctxt_user:ctxt_password@localhost:5432/ctxt_help
export REDIS_URL=redis://localhost:6379
export JWT_SECRET_KEY=dev-secret-key-change-in-production
export DEBUG=true
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
EOF
    chmod +x start-backend.sh
    
    # Frontend start script  
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
cd frontend
export VITE_API_BASE_URL=http://localhost:8000
npm run dev
EOF
    chmod +x start-frontend.sh
    
    # MCP server start script
    cat > start-mcp.sh << 'EOF'
#!/bin/bash
cd mcp-server
export API_BASE_URL=http://localhost:8000
export PORT=3001
export NODE_ENV=development
npm run dev 2>/dev/null || echo "MCP server not ready yet - run 'npm install' in mcp-server directory"
EOF
    chmod +x start-mcp.sh
    
    echo "✅ Development scripts created"
}

# Main setup function
main() {
    check_prerequisites
    setup_env
    start_database
    setup_backend
    setup_frontend
    setup_mcp
    create_scripts
    
    echo ""
    echo "🎉 Setup complete! To start development:"
    echo ""
    echo "1. Keep databases running:"
    echo "   docker-compose up -d postgresql redis"
    echo ""
    echo "2. Start backend (in new terminal):"
    echo "   ./start-backend.sh"
    echo ""
    echo "3. Start frontend (in new terminal):"
    echo "   ./start-frontend.sh"
    echo ""
    echo "4. Start MCP server (in new terminal):"
    echo "   ./start-mcp.sh"
    echo ""
    echo "🌐 URLs:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo "   MCP Server: http://localhost:3001"
    echo ""
    echo "📋 To stop databases:"
    echo "   docker-compose down"
    echo ""
}

# Run main function
main