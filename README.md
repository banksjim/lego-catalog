# Lego Set Catalog

A full-stack web application for cataloging and managing your Lego set collection. Built with Go backend and React TypeScript frontend.

## Features

### Core Features
- **Complete Set Management**: Add, edit, delete, and view all your Lego sets
- **Image Support**: Upload images or paste from clipboard (Ctrl+V / Cmd+V)
- **Comprehensive Set Details**:
  - Unique set number (required)
  - Alternate set number (optional)
  - Title, description, and notes
  - Series/theme categorization
  - Release year
  - Number of parts and minifigures
  - Ownership status and quantity tracking
  - Approximate value with last updated date
  - Bricklink URL integration

### Advanced Features
- **Statistics Dashboard**: View collection insights including:
  - Total sets and owned sets
  - Total pieces and minifigures
  - Total and average collection value
  - Most expensive set, largest set, oldest and newest sets
- **Search**: Global search across all set fields
- **Filtering**: Filter by series/theme and ownership status
- **Sorting**: Sort by title, set number, year, value, or parts count (ascending/descending)
- **CSV Import/Export**: Bulk manage your collection
- **Responsive Design**: Fully functional on desktop, tablet, and mobile devices
- **Dark Mode**: Built-in light and dark theme support

## Technology Stack

### Backend
- **Language**: Go 1.21+
- **Database**: MySQL 8.0+
- **Key Libraries**:
  - gorilla/mux - HTTP routing
  - go-sql-driver/mysql - MySQL driver
  - google/uuid - UUID generation
  - rs/cors - CORS middleware

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Testing**: Vitest + React Testing Library

## Prerequisites

- Go 1.21 or higher
- Node.js 18+ and npm
- MySQL 8.0 or higher
- Git

## Installation & Setup

### 1. Clone the Repository

```bash
cd ~/Development/Learning/AI/lego-database
```

### 2. Database Setup

```bash
# Log into MySQL
mysql -u root -p

# Create the database (or let the app create it automatically)
CREATE DATABASE lego_catalog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create a database user (optional but recommended)
CREATE USER 'lego_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON lego_catalog.* TO 'lego_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Backend Setup

```bash
cd backend

# Install Go dependencies
go mod tidy

# Export environment variables (replace 'your_password' with your MySQL root password)
export DB_USER=root
export DB_PASSWORD=your_password
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=lego_catalog
export PORT=8080
export UPLOAD_DIR=../images

# Run the backend server
go run cmd/server/main.go
```

**Note:** For subsequent runs (after database is created), use:
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

The backend will:
- Initialize the database if it doesn't exist
- Run migrations automatically
- Start the API server on http://localhost:8080

### 4. Frontend Setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on http://localhost:3001

**Note for WSL users:** Access from Windows using your WSL IP address (e.g., http://172.24.151.211:3001)

## Usage

### Adding a Set

1. Click "Add Set" from the navigation or dashboard
2. Fill in the required fields (Set Number and Title)
3. Optionally add an image:
   - Click "Choose File" to upload
   - Or paste an image from your clipboard (Ctrl+V / Cmd+V)
4. Fill in additional details as needed
5. Click "Create Set"

### Viewing Your Collection

1. Navigate to "My Sets" to see all your sets
2. Use the search bar to find specific sets
3. Filter by series or ownership status
4. Sort by different criteria (title, value, parts, etc.)
5. View the total value of your owned sets at the top

### Editing a Set

1. From the "My Sets" page, click "Edit" on any set card
2. Modify the fields you want to change
3. Upload a new image if desired
4. Click "Update Set"

### CSV Import/Export

**Export:**
1. Go to "My Sets"
2. Click "Export CSV"
3. Save the file to your computer

**Import:**
1. Go to "My Sets"
2. Click "Import CSV"
3. Select a CSV file with the correct format
4. The app will import new sets and skip duplicates

### Dark Mode

Click the sun/moon icon in the top right to toggle between light and dark modes. Your preference is saved automatically.

## CSV Format

The CSV file should have the following columns (in order):

```
Set Number, Alternate Set Number, Title, Owned, Quantity Owned, Release Year, Description, Series, Number of Parts, Number of Minifigs, Bricklink URL, Approximate Value, Value Last Updated, Notes
```

Example:
```csv
10276,,Colosseum,true,1,2020,Roman Colosseum,Creator Expert,9036,0,https://www.bricklink.com/v2/catalog/catalogitem.page?S=10276-1,549.99,2024-01-15,Amazing set!
```

## API Endpoints

### Lego Sets
- `GET /api/lego-sets` - Get all sets (with optional filters)
- `GET /api/lego-sets/:id` - Get a specific set
- `POST /api/lego-sets` - Create a new set
- `PUT /api/lego-sets/:id` - Update a set
- `DELETE /api/lego-sets/:id` - Delete a set
- `POST /api/lego-sets/:id/image` - Upload set image
- `GET /api/lego-sets/search?q=query` - Search sets
- `GET /api/lego-sets/export` - Export sets to CSV
- `POST /api/lego-sets/import` - Import sets from CSV

### Other Endpoints
- `GET /api/series` - Get all unique series names
- `GET /api/statistics` - Get collection statistics
- `GET /images/:filename` - Serve images

## Development

### Running Tests

**Backend:**
```bash
cd backend
go test ./tests/...
```

**Frontend:**
```bash
cd frontend
npm test
```

### Building for Production

**Backend:**
```bash
cd backend
go build -o lego-catalog cmd/server/main.go
./lego-catalog
```

**Frontend:**
```bash
cd frontend
npm run build
# Build output will be in the 'dist' directory
```

## Future Cloud Deployment (GCP)

The application is designed to be easily deployable to Google Cloud Platform:

### Planned Architecture
- **Backend**: Google App Engine (Standard or Flexible)
- **Database**: Cloud SQL for MySQL
- **Image Storage**: Google Cloud Storage
- **DNS**: Cloud DNS

### Migration Notes
- Images are currently stored locally with unique filenames (GUID_SetNumber.ext)
- When migrating to GCP:
  1. Create a Cloud Storage bucket
  2. Update the image service to use GCS SDK
  3. Migrate existing images to the bucket
  4. Update image URLs to point to GCS
- Database schema is compatible with Cloud SQL
- Environment variables can be configured in App Engine settings

## Project Structure

```
lego-database/
├── backend/
│   ├── cmd/server/          # Main application entry point
│   ├── internal/
│   │   ├── api/handlers/    # HTTP request handlers
│   │   ├── db/              # Database connection and repository
│   │   ├── models/          # Data models
│   │   └── services/        # Business logic (CSV, images)
│   ├── migrations/          # SQL migration files
│   ├── tests/               # Backend tests
│   └── go.mod               # Go module definition
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript type definitions
│   │   ├── hooks/           # Custom React hooks
│   │   └── App.tsx          # Main application component
│   └── package.json         # Node.js dependencies
├── images/                  # Image storage directory
└── README.md               # This file
```

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running: `mysql --version`
- Check that environment variables are exported correctly
- Ensure you're using the correct MySQL root password
- Ensure database exists or app has permission to create it

### Port Already in Use
- Backend: Change `PORT` environment variable when exporting (e.g., `export PORT=8081`)
- Frontend: Change port in vite.config.ts

### Images Not Displaying
- Check that the `images` directory exists
- Verify `UPLOAD_DIR` environment variable is set to `../images`
- Ensure proper file permissions on images directory

### CORS Errors
- Verify frontend URL is allowed in backend cors configuration
- Check that both servers are running on expected ports

### WSL Networking Issues (Windows)
If running in WSL and accessing from Windows browser:
- Use WSL IP address instead of `localhost` (e.g., `http://172.24.151.211:3001`)
- Find your WSL IP: `hostname -I | awk '{print $1}'`
- The vite.config.ts is already configured with `host: '0.0.0.0'` for WSL support
- WSL IP may change after reboot - use the command above to find the new IP

## License

This project is provided as-is for personal use.

## Support

For issues or questions, please refer to the code documentation or create an issue in the repository.
