# Quick Start Guide

Get your Lego Catalog up and running in 5 minutes!

## Prerequisites Checklist

- [ ] Go 1.21+ installed (`go version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] MySQL 8.0+ installed and running
- [ ] Git installed

## Step 1: Database (2 minutes)

```bash
# Log into MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE lego_catalog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lego_user'@'localhost' IDENTIFIED BY 'lego_password_123';
GRANT ALL PRIVILEGES ON lego_catalog.* TO 'lego_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 2: Backend (1 minute)

```bash
cd ~/Development/Learning/AI/lego-database/backend

# Install dependencies
go mod tidy

# Export environment variables (replace 'your_password' with your MySQL root password)
export DB_USER=root
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=lego_catalog
export PORT=8080
export UPLOAD_DIR=../images

# Run the server
go run cmd/server/main.go
```

**Note:** After the first run, the database and user will be created. For subsequent runs, you can use:
```bash
export DB_USER=lego_user
export DB_PASSWORD=lego_password_123
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=lego_catalog
export PORT=8080
export UPLOAD_DIR=../images

go run cmd/server/main.go
```

Keep this terminal open! You should see:
```
Database 'lego_catalog' initialized successfully
Database connection established successfully
Running migration: 001_create_lego_sets_table.sql
Migrations completed successfully
Server starting on port 8080
```

## Step 3: Frontend (1 minute)

Open a NEW terminal:

```bash
cd ~/Development/Learning/AI/lego-database/frontend

# Install dependencies
npm install

# Start the app
npm run dev
```

You should see:
```
VITE v5.0.12  ready in XXX ms
➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

## Step 4: Open the App

Open your browser to: **http://localhost:3001** (or use your WSL IP address from Windows: **http://172.24.151.211:3001**)

You're ready to start cataloging your Lego sets!

## First Steps

1. **Add your first set**:
   - Click "Add Set"
   - Enter set number (e.g., "10276")
   - Enter title (e.g., "Colosseum")
   - Fill in other details
   - Upload an image or paste from clipboard (Ctrl+V)
   - Click "Create Set"

2. **Explore the dashboard**:
   - Click "Dashboard" to see statistics
   - View your collection value and insights

3. **Import bulk data** (optional):
   - Prepare a CSV file with your sets
   - Go to "My Sets"
   - Click "Import CSV"

## Stopping the App

- Frontend: Press `Ctrl+C` in the frontend terminal
- Backend: Press `Ctrl+C` in the backend terminal

## Next Time

Just run these commands in separate terminals:

```bash
# Terminal 1 - Backend
cd ~/Development/Learning/AI/lego-database/backend

# Export environment variables
export DB_USER=lego_user
export DB_PASSWORD=lego_password_123
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=lego_catalog
export PORT=8080
export UPLOAD_DIR=../images

# Run server
go run cmd/server/main.go

# Terminal 2 - Frontend
cd ~/Development/Learning/AI/lego-database/frontend
npm run dev
```

Then open http://localhost:3001 (or http://172.24.151.211:3001 from Windows)

## Features

- **Dashboard**: View collection statistics, most valuable set, largest set
- **My Sets**: Browse, search, filter, and sort your collection
- **Add/Edit Sets**: Full form with:
  - Basic info (set number, title, series, year)
  - Parts and minifigs count
  - Ownership tracking with quantities
  - Image upload (or paste from clipboard with Ctrl+V)
  - Condition description (text field for noting set condition)
  - Bricklink and Rebrickable URLs (no http:// required)
  - Value tracking with last updated date
  - Notes field
- **Import/Export**: CSV import/export for bulk operations
- **Dark Mode**: Toggle between light and dark themes
- **Mobile Responsive**: Collapsible filters and hamburger menu

## Common Issues

**"Database connection failed"**
- Make sure MySQL is running
- Check credentials in backend/.env

**"Port 8080 already in use"**
- Change PORT in backend/.env to 8081 (or any free port)

**"Port 3001 already in use"**
- The frontend will automatically try 3002, 3003, etc.

**Need help?**
- See README.md for detailed documentation
- Check the Troubleshooting section
