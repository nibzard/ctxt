# Contributing to ctxt.help

We love your input! We want to make contributing to ctxt.help as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

### Branch Naming Convention

- `feature/` - New features (`feature/mcp-server-integration`)
- `fix/` - Bug fixes (`fix/conversion-error-handling`)
- `docs/` - Documentation (`docs/api-reference`)
- `refactor/` - Code refactoring (`refactor/context-block-component`)

### Commit Message Format

```
type(scope): brief description

- Detailed explanation if needed
- Use bullet points for multiple changes
- Reference issues: Closes #123

Types: feat, fix, docs, style, refactor, test, chore
Scopes: frontend, backend, mcp-server, docs, deploy
```

Examples:
```
feat(frontend): add drag-and-drop context block reordering

- Implement React DnD for context blocks
- Add visual feedback during drag operations
- Update block order in state management

fix(backend): resolve SEO slug generation conflicts

- Add uniqueness check with MD5 fallback
- Handle special characters in titles
- Closes #45
```

## Code Style

### TypeScript (Frontend & MCP Server)
- Use strict typing with explicit interfaces
- Prefer explicit return types for functions
- Use const assertions for immutable data
- Follow React component naming conventions

### Python (Backend)
- Use type hints for all function signatures
- Follow PEP 8 style guide
- Use Pydantic models for request/response schemas
- Document all public functions with docstrings

### File Naming
- **Files**: kebab-case (`context-builder.tsx`, `conversion-service.py`)
- **Directories**: kebab-case (`mcp-server`, `api-routes`)
- **Classes**: PascalCase (`ContextBuilder`, `ConversionService`)
- **Functions/Variables**: camelCase (TS) / snake_case (Python)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`, `RATE_LIMIT_FREE`)

## Testing

### Frontend (Jest + React Testing Library)
```bash
cd frontend
npm test              # Run tests
npm run test:coverage # Generate coverage report
npm run test:e2e      # End-to-end tests
```

**Coverage Requirements**: >80%

### Backend (Pytest)
```bash
cd backend
pytest tests/ -v      # Run all tests
pytest --cov=app     # Generate coverage report
```

**Coverage Requirements**: >85%

### MCP Server (Jest)
```bash
cd mcp-server
npm test              # Run tests
npm run test:integration # Integration tests
```

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose

### Quick Start
```bash
# Clone and setup
git clone https://github.com/username/ctxt.git
cd ctxt

# Start development environment
docker-compose up -d

# Frontend setup
cd frontend
npm install
npm run dev

# Backend setup
cd ../backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# MCP server setup
cd ../mcp-server
npm install
npm run dev
```

## Documentation

### Code Documentation
- Use JSDoc for TypeScript functions
- Use docstrings for Python functions
- Include parameter types and return values
- Provide examples for complex functions

### API Documentation
- FastAPI generates automatic documentation
- Include request/response examples
- Document error codes and responses
- Provide curl examples

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by opening a new issue.

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We use GitHub issues to track feature requests as well. When requesting a feature:

- Explain the problem you're trying to solve
- Describe the solution you'd like
- Describe alternatives you've considered
- Include mockups or examples if applicable

## Security Vulnerabilities

If you discover a security vulnerability, please send an email to security@ctxt.help instead of opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask questions by opening an issue or reaching out to the maintainers directly.

---

Thank you for contributing to ctxt.help! 🚀