# CLAUDE.md - AI Assistant Guide for Meiwa Product

## Project Overview

This is a full-stack web application with:
- **Frontend**: Next.js (React framework)
- **Backend**: Django REST Framework (DRF)
- **Language**: Japanese development team (comments and documentation may be in Japanese)

## Repository Structure

```
meiwa-product/
├── frontend/          # Next.js application
├── backend/           # Django REST Framework API
├── .gitignore        # Git ignore patterns for Python, Node.js, Django, and Next.js
└── CLAUDE.md         # This file
```

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js (React-based)
- **Package Manager**: npm, yarn, or pnpm
- **Build Output**: `.next/`, `out/`, `build/`, `dist/`
- **Environment Files**: `.env.local`, `.env.development.local`, `.env.production.local`

### Backend (Django REST Framework)
- **Framework**: Django with Django REST Framework
- **Language**: Python 3.x
- **Virtual Environment**: `backend/venv/` or `venv/`
- **Database**: SQLite (development), configurable for production
- **Environment Files**: `.env` files in backend directory

## Development Setup

### Backend Setup
1. Navigate to backend directory: `cd backend`
2. Create virtual environment: `python -m venv venv`
3. Activate virtual environment:
   - Linux/Mac: `source venv/bin/activate`
   - Windows: `venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run migrations: `python manage.py migrate`
6. Create superuser: `python manage.py createsuperuser`
7. Start development server: `python manage.py runserver`

### Frontend Setup
1. Navigate to frontend directory: `cd frontend`
2. Install dependencies: `npm install` (or `yarn install`, `pnpm install`)
3. Create `.env.local` file with necessary environment variables
4. Start development server: `npm run dev` (or `yarn dev`, `pnpm dev`)

## Key Development Workflows

### Starting Development
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Creating Django Apps
```bash
cd backend
python manage.py startapp <app_name>
# Remember to add app to INSTALLED_APPS in settings.py
```

### Database Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
python manage.py collectstatic
```

## Code Conventions

### General Principles
1. **Comments and Documentation**: May be in Japanese - respect existing language conventions
2. **File Organization**: Keep frontend and backend strictly separated
3. **Environment Variables**: Never commit `.env` files or credentials
4. **Dependencies**: Keep requirements.txt and package.json up to date

### Backend (Django/Python)
- Follow PEP 8 style guide
- Use Django's built-in tools and conventions
- API endpoints should follow REST principles
- Use Django REST Framework serializers for API responses
- Keep business logic in models or service layers
- Use Django's ORM for database operations
- Settings structure:
  - `settings.py` for base settings
  - `local_settings.py` for local overrides (gitignored)

### Frontend (Next.js/React)
- Follow React and Next.js best practices
- Use TypeScript if configured (check project setup)
- Component organization:
  - Pages in `pages/` or `app/` directory (depending on Next.js version)
  - Reusable components in `components/`
  - API routes in `pages/api/` or `app/api/`
- Use Next.js Image component for images
- Implement proper error boundaries
- Use environment variables through `process.env.NEXT_PUBLIC_*` for client-side access

### API Communication
- Frontend should communicate with backend via RESTful API
- Use async/await for API calls
- Implement proper error handling
- Consider using axios or fetch with proper configuration
- Handle CORS configuration in Django settings

## File Patterns to Ignore

The following patterns are gitignored:
- Python: `__pycache__/`, `*.pyc`, `*.pyo`, `.Python`, `*.egg-info/`
- Django: `*.log`, `db.sqlite3`, `media/`, `staticfiles/`
- Node.js: `node_modules/`, `*.log`
- Next.js: `.next/`, `out/`, `build/`, `dist/`
- Environment: All `.env*` files
- IDE: `.vscode/`, `.idea/`, `.DS_Store`

## AI Assistant Guidelines

### When Reading Code
1. Check both frontend and backend for related functionality
2. Respect existing Japanese comments and documentation
3. Understand the full request flow (frontend → API → backend → database)
4. Look for existing patterns before suggesting new approaches

### When Writing Code
1. **Never commit sensitive data**: Check for API keys, passwords, tokens
2. **Follow existing patterns**: Match the style of surrounding code
3. **Update dependencies**: If adding packages, update requirements.txt or package.json
4. **Consider both sides**: Frontend changes may require backend changes and vice versa
5. **Error handling**: Implement proper error handling on both frontend and backend
6. **Documentation**: Add comments for complex logic (in Japanese if that's the convention)
7. **Testing**: Consider adding tests for new functionality

### When Making Changes
1. **Read before writing**: Always read existing files before modifying
2. **Minimal changes**: Only change what's necessary for the task
3. **Consistency**: Match existing code style and conventions
4. **Dependencies**: Note if new packages need to be installed
5. **Migrations**: Create Django migrations when changing models
6. **Build verification**: Ensure code builds without errors

### Common Tasks

#### Adding a New API Endpoint
1. Create/update Django model in `backend/<app>/models.py`
2. Create serializer in `backend/<app>/serializers.py`
3. Create view in `backend/<app>/views.py`
4. Add URL pattern in `backend/<app>/urls.py` and main `urls.py`
5. Run `makemigrations` and `migrate` if model changed
6. Update frontend to call new endpoint

#### Adding a New Frontend Page
1. Create page component in `frontend/pages/` or `frontend/app/`
2. Create necessary React components in `frontend/components/`
3. Add API calls to communicate with backend
4. Update navigation/routing as needed

#### Database Schema Changes
1. Modify models in `backend/<app>/models.py`
2. Run `python manage.py makemigrations`
3. Review generated migration file
4. Run `python manage.py migrate`
5. Update serializers and views if needed

## Security Considerations

1. **CORS**: Configure properly in Django settings
2. **Authentication**: Implement proper authentication (JWT, session, etc.)
3. **Authorization**: Check permissions on API endpoints
4. **Input Validation**: Validate all user inputs on backend
5. **SQL Injection**: Use Django ORM, avoid raw SQL
6. **XSS**: Sanitize outputs, React handles most XSS by default
7. **CSRF**: Configure Django CSRF protection properly
8. **Environment Variables**: Use for all secrets and configuration

## Testing

### Backend Testing
```bash
cd backend
python manage.py test
```

### Frontend Testing
```bash
cd frontend
npm test  # or yarn test, pnpm test
```

## Deployment Considerations

1. **Frontend**: Build static files with `npm run build`, deploy to static hosting or server
2. **Backend**: Configure production settings, use production WSGI server (gunicorn, uwsgi)
3. **Database**: Switch from SQLite to PostgreSQL/MySQL for production
4. **Static Files**: Configure Django to serve static files properly
5. **Environment Variables**: Set production environment variables
6. **CORS**: Configure for production domains
7. **Security**: Enable Django security settings for production

## Troubleshooting

### Common Issues
1. **CORS errors**: Check Django CORS settings and allowed origins
2. **Import errors**: Verify virtual environment is activated and dependencies installed
3. **Migration conflicts**: Check for conflicting migrations and resolve manually
4. **Port conflicts**: Ensure ports 3000 (Next.js) and 8000 (Django) are available
5. **Module not found**: Install missing dependencies

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework Documentation](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)

## Notes for AI Assistants

- This is a Japanese development project - be prepared for Japanese comments and documentation
- The project is in early stages - directory structure exists but implementation may be minimal
- Always verify current project state before making assumptions about existing code
- When suggesting changes, explain the impact on both frontend and backend
- Provide complete, working code examples rather than partial snippets
- Consider Japanese language context in error messages and documentation
