package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"lego-catalog/internal/api/handlers"
	"lego-catalog/internal/db"
	"lego-catalog/internal/services"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize database
	if err := db.InitDatabase(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Connect to database
	database, err := db.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := runMigrations(database); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Create image storage directory
	uploadDir := getEnv("UPLOAD_DIR", "./images")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("Failed to create image storage directory: %v", err)
	}

	// Initialize services
	legoSetRepo := db.NewLegoSetRepository(database)
	imageService := services.NewImageService(uploadDir)
	csvService := services.NewCSVService()

	// Initialize handlers
	legoSetHandler := handlers.NewLegoSetHandler(legoSetRepo, imageService, csvService)

	// Setup router
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/lego-sets", legoSetHandler.GetAllLegoSets).Methods("GET")
	api.HandleFunc("/lego-sets", legoSetHandler.CreateLegoSet).Methods("POST")
	api.HandleFunc("/lego-sets/search", legoSetHandler.SearchLegoSets).Methods("GET")
	api.HandleFunc("/lego-sets/export", legoSetHandler.ExportCSV).Methods("GET")
	api.HandleFunc("/lego-sets/import", legoSetHandler.ImportCSV).Methods("POST")
	api.HandleFunc("/lego-sets/{id}", legoSetHandler.GetLegoSet).Methods("GET")
	api.HandleFunc("/lego-sets/{id}", legoSetHandler.UpdateLegoSet).Methods("PUT")
	api.HandleFunc("/lego-sets/{id}", legoSetHandler.DeleteLegoSet).Methods("DELETE")
	api.HandleFunc("/lego-sets/{id}/image", legoSetHandler.UploadImage).Methods("POST")
	api.HandleFunc("/series", legoSetHandler.GetAllSeries).Methods("GET")
	api.HandleFunc("/statistics", legoSetHandler.GetStatistics).Methods("GET")

	// Serve images
	router.PathPrefix("/images/").Handler(http.StripPrefix("/images/", http.FileServer(http.Dir(uploadDir))))

	// CORS configuration
	c := cors.New(cors.Options{
		AllowOriginFunc: func(origin string) bool {
			// Allow localhost and any IP address for development (WSL support)
			return true
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func runMigrations(database *db.Database) error {
	migrationsDir := "./migrations"

	files, err := ioutil.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	for _, file := range files {
		if filepath.Ext(file.Name()) != ".sql" {
			continue
		}

		log.Printf("Running migration: %s", file.Name())

		content, err := ioutil.ReadFile(filepath.Join(migrationsDir, file.Name()))
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file.Name(), err)
		}

		if _, err := database.Exec(string(content)); err != nil {
			return fmt.Errorf("failed to execute migration %s: %w", file.Name(), err)
		}
	}

	log.Println("Migrations completed successfully")
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
