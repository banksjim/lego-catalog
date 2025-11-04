# Development Workflow

This project uses a branch-based workflow with pull requests for all changes.

## Branch Strategy

- **`main`** - Production-ready code, protected branch
- **`feature/*`** - New features (e.g., `feature/search-functionality`)
- **`bugfix/*`** - Bug fixes (e.g., `bugfix/login-error`)
- **`enhancement/*`** - Improvements to existing features

## Workflow Steps

### 1. Start a New Feature

```bash
# Make sure you're on main and it's up to date
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write your code
- Test thoroughly
- Commit frequently with clear messages

```bash
git add .
git commit -m "Clear description of what changed"
```

### 3. Push Feature Branch

```bash
# First time pushing this branch
git push -u origin feature/your-feature-name

# Subsequent pushes
git push
```

### 4. Create Pull Request

1. Go to https://github.com/banksjim/lego-catalog
2. Click "Compare & pull request"
3. Add description of changes
4. Review the diff
5. Click "Create pull request"

### 5. Review and Merge

1. Review changes in GitHub
2. Click "Merge pull request"
3. Delete the feature branch (GitHub will prompt)

### 6. Update Local Main

```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name  # Delete local feature branch
```

## Commit Message Format

Use clear, descriptive commit messages:

```
Add user authentication feature

- Implemented JWT token-based auth
- Added login/logout endpoints
- Created protected route middleware
```

## Never Commit

- Environment files (`.env`)
- Database files
- `node_modules/`
- Build artifacts
- User uploaded images (stored in `/images/`)
- Temporary files

All of these are protected by `.gitignore`

## Questions?

See QUICKSTART.md for running the application.
