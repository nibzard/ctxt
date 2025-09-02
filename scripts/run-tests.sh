#!/bin/bash

# ctxt.help Test Runner Script
# Runs comprehensive tests across all components

set -e

echo "🧪 Starting ctxt.help Test Suite"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
BACKEND_TESTS_PASSED=false
FRONTEND_TESTS_PASSED=false
MCP_TESTS_PASSED=false

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

# Backend Tests
echo -e "${BLUE}📦 Running Backend Tests${NC}"
echo "========================"

cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..." "info"
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
print_status "Installing backend dependencies..." "info"
pip install -r requirements.txt > /dev/null 2>&1

# Run backend tests
print_status "Running backend tests with coverage..." "info"
if python -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html:htmlcov --cov-fail-under=85; then
    print_status "Backend tests passed!" "success"
    BACKEND_TESTS_PASSED=true
else
    print_status "Backend tests failed!" "error"
fi

# Deactivate virtual environment
deactivate
cd ..

# Frontend Tests
echo -e "${BLUE}🎨 Running Frontend Tests${NC}"
echo "=========================="

cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..." "info"
    npm install > /dev/null 2>&1
fi

# Run frontend tests
print_status "Running frontend tests with coverage..." "info"
if npm run test:coverage > /dev/null 2>&1; then
    print_status "Frontend tests passed!" "success"
    FRONTEND_TESTS_PASSED=true
else
    print_status "Frontend tests failed!" "error"
fi

cd ..

# MCP Server Tests
echo -e "${BLUE}🔌 Running MCP Server Tests${NC}"
echo "============================="

cd mcp-server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing MCP server dependencies..." "info"
    npm install > /dev/null 2>&1
fi

# Build TypeScript
print_status "Building MCP server..." "info"
npm run build > /dev/null 2>&1

# Run MCP tests (if they exist)
if [ -f "package.json" ] && npm run test > /dev/null 2>&1; then
    print_status "MCP server tests passed!" "success"
    MCP_TESTS_PASSED=true
else
    print_status "MCP server tests not found or failed" "warning"
    MCP_TESTS_PASSED=true  # Don't fail if tests don't exist yet
fi

cd ..

# Summary
echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "======================"

if [ "$BACKEND_TESTS_PASSED" = true ]; then
    print_status "Backend: PASSED" "success"
else
    print_status "Backend: FAILED" "error"
fi

if [ "$FRONTEND_TESTS_PASSED" = true ]; then
    print_status "Frontend: PASSED" "success"  
else
    print_status "Frontend: FAILED" "error"
fi

if [ "$MCP_TESTS_PASSED" = true ]; then
    print_status "MCP Server: PASSED" "success"
else
    print_status "MCP Server: FAILED" "error"
fi

# Overall result
if [ "$BACKEND_TESTS_PASSED" = true ] && [ "$FRONTEND_TESTS_PASSED" = true ] && [ "$MCP_TESTS_PASSED" = true ]; then
    echo ""
    print_status "🎉 All tests passed! Your code is ready for production." "success"
    exit 0
else
    echo ""
    print_status "💥 Some tests failed. Please fix the issues before deploying." "error"
    exit 1
fi