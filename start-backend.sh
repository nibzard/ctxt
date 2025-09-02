#!/bin/bash
cd backend
source venv/bin/activate
export DATABASE_URL=postgresql://ctxt_user:ctxt_password@192.168.117.2:5432/ctxt_help
export REDIS_URL=redis://localhost:6379
export JWT_SECRET_KEY=dev-secret-key-change-in-production
export DEBUG=true
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
