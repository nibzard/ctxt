#!/bin/bash

# Environment Setup Script for ctxt.help
# Sets up the application for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$2" = "success" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    elif [ "$2" = "error" ]; then
        echo -e "${RED}❌ $1${NC}"
    elif [ "$2" = "warning" ]; then
        echo -e "${YELLOW}⚠️ $1${NC}"
    else
        echo -e "${BLUE}ℹ️ $1${NC}"
    fi
}

# Parse command line arguments
ENVIRONMENT=${1:-development}
FORCE=${2:-false}

if [ "$ENVIRONMENT" != "development" ] && [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "testing" ]; then
    print_status "Invalid environment: $ENVIRONMENT. Use 'development', 'production', or 'testing'" "error"
    exit 1
fi

echo -e "${BLUE}🚀 Setting up ctxt.help for ${ENVIRONMENT} environment${NC}"
echo "=============================================="

# Check if .env file exists
if [ -f ".env" ] && [ "$FORCE" != "true" ]; then
    print_status "Environment file .env already exists. Use 'force' as second argument to overwrite." "warning"
    echo "Current environment variables:"
    echo "$(grep -E '^[A-Z_]+=.*' .env || true)"
    echo ""
    read -p "Do you want to continue and potentially overwrite existing settings? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_status "Setup cancelled by user" "info"
        exit 0
    fi
fi

# Generate JWT secret if not provided
generate_jwt_secret() {
    if command -v python3 &> /dev/null; then
        python3 -c "import secrets; print(secrets.token_urlsafe(32))"
    elif command -v openssl &> /dev/null; then
        openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
    else
        print_status "Cannot generate JWT secret. Please install Python 3 or OpenSSL" "error"
        echo "use-a-secure-random-string-at-least-32-chars"
    fi
}

# Create environment-specific .env file
create_env_file() {
    print_status "Creating .env file for $ENVIRONMENT environment..." "info"
    
    # Generate JWT secret
    JWT_SECRET=$(generate_jwt_secret)
    
    cat > .env << EOF
# Environment Configuration for ctxt.help
# Generated on $(date)
# Environment: $ENVIRONMENT

# Security - REQUIRED
JWT_SECRET_KEY=$JWT_SECRET

# Application Settings
ENVIRONMENT=$ENVIRONMENT
DEBUG=$([ "$ENVIRONMENT" = "development" ] && echo "true" || echo "false")

# Database Configuration
EOF

    if [ "$ENVIRONMENT" = "production" ]; then
        cat >> .env << 'EOF'
DATABASE_URL=postgresql://username:password@localhost:5432/ctxt_help_prod
REDIS_URL=redis://localhost:6379/0
EOF
    elif [ "$ENVIRONMENT" = "testing" ]; then
        cat >> .env << 'EOF'
DATABASE_URL=sqlite:///:memory:
REDIS_URL=redis://localhost:6379/1
EOF
    else
        cat >> .env << 'EOF'
DATABASE_URL=postgresql://ctxt_user:ctxt_password@localhost:5432/ctxt_help
REDIS_URL=redis://localhost:6379/0
EOF
    fi

    cat >> .env << 'EOF'

# Polar.sh Payment Integration (Get from https://polar.sh/dashboard)
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_ORGANIZATION_ID=
POLAR_SUCCESS_URL=http://localhost:5173/success?checkout_id={CHECKOUT_ID}

# Product IDs from Polar Dashboard
POLAR_POWER_PRODUCT_ID=
POLAR_PRO_PRODUCT_ID=
POLAR_ENTERPRISE_PRODUCT_ID=

# Email Configuration (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=noreply@ctxt.help

# Monitoring (Optional)
SENTRY_DSN=

# Feature Flags
JINA_FALLBACK_ENABLED=true
MCP_SERVER_ENABLED=true
SEO_PAGES_ENABLED=true
ANALYTICS_ENABLED=true
EOF

    if [ "$ENVIRONMENT" = "production" ]; then
        cat >> .env << 'EOF'

# Production CORS Settings
ALLOWED_ORIGINS=https://ctxt.help,https://www.ctxt.help,https://app.ctxt.help
EOF
    else
        cat >> .env << 'EOF'

# Development CORS Settings
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
EOF
    fi
}

# Set up database for environment
setup_database() {
    if [ "$ENVIRONMENT" = "production" ]; then
        print_status "Production database setup requires manual configuration" "warning"
        echo "Please ensure your PostgreSQL database is properly configured:"
        echo "1. Create database: createdb ctxt_help_prod"
        echo "2. Create user with appropriate permissions"
        echo "3. Update DATABASE_URL in .env with production credentials"
        echo "4. Run database migrations: alembic upgrade head"
        return
    fi
    
    if [ "$ENVIRONMENT" = "testing" ]; then
        print_status "Testing uses in-memory SQLite - no setup required" "info"
        return
    fi

    print_status "Setting up development database..." "info"
    
    # Check if PostgreSQL is running
    if ! command -v psql &> /dev/null; then
        print_status "PostgreSQL not found. Please install PostgreSQL first." "error"
        return 1
    fi

    # Create development database and user
    print_status "Creating development database..." "info"
    
    # This requires PostgreSQL to be running and accessible
    createdb ctxt_help 2>/dev/null || true
    psql -c "CREATE USER ctxt_user WITH PASSWORD 'ctxt_password';" 2>/dev/null || true
    psql -c "GRANT ALL PRIVILEGES ON DATABASE ctxt_help TO ctxt_user;" 2>/dev/null || true
    
    print_status "Development database setup complete" "success"
}

# Set up backend environment
setup_backend() {
    print_status "Setting up backend environment..." "info"
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..." "info"
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    print_status "Installing backend dependencies..." "info"
    pip install -r requirements.txt > /dev/null 2>&1
    
    # Run database migrations
    if [ "$ENVIRONMENT" != "testing" ]; then
        print_status "Running database migrations..." "info"
        alembic upgrade head || print_status "Migration failed - you may need to run this manually" "warning"
    fi
    
    cd ..
    print_status "Backend setup complete" "success"
}

# Set up frontend environment  
setup_frontend() {
    print_status "Setting up frontend environment..." "info"
    
    cd frontend
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..." "info"
        npm install > /dev/null 2>&1
    fi
    
    # Create frontend environment file
    print_status "Creating frontend .env.local file..." "info"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        VITE_API_BASE_URL="https://api.ctxt.help"
    else
        VITE_API_BASE_URL="http://localhost:8000"
    fi
    
    cat > .env.local << EOF
# Frontend Environment Configuration
VITE_API_BASE_URL=$VITE_API_BASE_URL
VITE_ENVIRONMENT=$ENVIRONMENT
EOF
    
    cd ..
    print_status "Frontend setup complete" "success"
}

# Set up MCP server environment
setup_mcp_server() {
    print_status "Setting up MCP server environment..." "info"
    
    cd mcp-server
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing MCP server dependencies..." "info"
        npm install > /dev/null 2>&1
    fi
    
    # Build TypeScript
    print_status "Building MCP server..." "info"
    npm run build > /dev/null 2>&1 || print_status "Build failed - you may need to run this manually" "warning"
    
    cd ..
    print_status "MCP server setup complete" "success"
}

# Main setup function
main() {
    # Create .env file
    create_env_file
    
    # Setup database
    setup_database
    
    # Setup backend
    setup_backend
    
    # Setup frontend
    setup_frontend
    
    # Setup MCP server
    setup_mcp_server
    
    echo ""
    echo -e "${GREEN}🎉 Environment setup complete for $ENVIRONMENT!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review and update .env file with your actual values"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "2. Configure your production database and Redis instances"
        echo "3. Set up SSL certificates and reverse proxy"
        echo "4. Configure monitoring and logging"
    else
        echo "2. Start the services:"
        echo "   Backend:    cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
        echo "   Frontend:   cd frontend && npm run dev"
        echo "   MCP Server: cd mcp-server && npm run dev"
    fi
    
    echo ""
    echo "Configuration files created:"
    echo "- .env (root directory)"
    echo "- frontend/.env.local"
    echo ""
    
    if [ "$ENVIRONMENT" = "production" ]; then
        print_status "IMPORTANT: Review all configuration before deploying to production!" "warning"
    fi
}

# Run main function
main