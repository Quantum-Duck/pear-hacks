# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands

### Frontend
- Build: `cd frontend && npm run build`
- Development: `cd frontend && npm start`
- Test: `cd frontend && npm test`
- Test single file: `cd frontend && npm test -- --testPathPattern=path/to/test`
- Lint: `cd frontend && npx eslint src/**/*.js`
- Tailwind: `cd frontend && npm run start:tailwind`

### Backend
- Install: `cd backend && pip install -r requirements.txt`
- Run server: `cd backend && python server.py`
- Run local server: `cd backend && python local_server.py`
- Test: `cd backend && pytest`
- Test single file: `cd backend && pytest path/to/test.py::test_function_name -v`

## Code Style Guidelines

### Frontend
- React 19 with React Router & TailwindCSS
- Use functional components with hooks
- Import order: React, libraries, components, styles
- Error handling: Use try/catch blocks for async operations
- Naming: PascalCase for components, camelCase for functions/variables

### Backend
- Python 3.12+ with Flask and Supabase
- Type hints: Use Python type annotations where possible
- Imports order: standard library, third-party, local
- Error handling: Use appropriate exception handling with specific exception types
- API endpoints: Create in api/ directory with RESTful conventions
- Services: Business logic in services/ directory