package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"lego-catalog/internal/db"
	"lego-catalog/internal/models"
	"lego-catalog/internal/services"

	"github.com/gorilla/mux"
)

// LegoSetHandler handles HTTP requests for Lego sets
type LegoSetHandler struct {
	repo         *db.LegoSetRepository
	imageService *services.ImageService
	csvService   *services.CSVService
}

// NewLegoSetHandler creates a new handler
func NewLegoSetHandler(repo *db.LegoSetRepository, imageService *services.ImageService, csvService *services.CSVService) *LegoSetHandler {
	return &LegoSetHandler{
		repo:         repo,
		imageService: imageService,
		csvService:   csvService,
	}
}

// CreateLegoSet handles POST /api/lego-sets
func (h *LegoSetHandler) CreateLegoSet(w http.ResponseWriter, r *http.Request) {
	var req models.CreateLegoSetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.SetNumber == "" || req.Title == "" {
		respondWithError(w, http.StatusBadRequest, "Set number and title are required")
		return
	}

	// Check if set number already exists
	existing, err := h.repo.GetBySetNumber(req.SetNumber)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if existing != nil {
		respondWithError(w, http.StatusConflict, "Set number already exists")
		return
	}

	// Convert request to model
	set := &models.LegoSet{
		SetNumber:          req.SetNumber,
		AlternateSetNumber: req.AlternateSetNumber,
		Title:              req.Title,
		Owned:              req.Owned,
		QuantityOwned:      req.QuantityOwned,
		ReleaseYear:        req.ReleaseYear,
		Description:        req.Description,
		Series:             req.Series,
		NumParts:           req.NumParts,
		NumMinifigs:        req.NumMinifigs,
		BricklinkURL:       req.BricklinkURL,
		ApproximateValue:   req.ApproximateValue,
		Notes:              req.Notes,
	}

	// Parse value last updated date
	if req.ValueLastUpdated != nil && *req.ValueLastUpdated != "" {
		t, err := time.Parse("2006-01-02", *req.ValueLastUpdated)
		if err == nil {
			set.ValueLastUpdated = &t
		}
	}

	// Create the set
	if err := h.repo.Create(set); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create set")
		return
	}

	respondWithJSON(w, http.StatusCreated, set)
}

// GetLegoSet handles GET /api/lego-sets/{id}
func (h *LegoSetHandler) GetLegoSet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	set, err := h.repo.GetByID(id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if set == nil {
		respondWithError(w, http.StatusNotFound, "Set not found")
		return
	}

	respondWithJSON(w, http.StatusOK, set)
}

// GetAllLegoSets handles GET /api/lego-sets
func (h *LegoSetHandler) GetAllLegoSets(w http.ResponseWriter, r *http.Request) {
	filters := make(map[string]interface{})

	// Parse query parameters
	if series := r.URL.Query().Get("series"); series != "" {
		filters["series"] = series
	}

	if ownedStr := r.URL.Query().Get("owned"); ownedStr != "" {
		owned, _ := strconv.ParseBool(ownedStr)
		filters["owned"] = owned
	}

	sortBy := r.URL.Query().Get("sortBy")
	sortOrder := r.URL.Query().Get("sortOrder")

	sets, err := h.repo.GetAll(filters, sortBy, sortOrder)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	respondWithJSON(w, http.StatusOK, sets)
}

// SearchLegoSets handles GET /api/lego-sets/search
func (h *LegoSetHandler) SearchLegoSets(w http.ResponseWriter, r *http.Request) {
	searchTerm := r.URL.Query().Get("q")
	if searchTerm == "" {
		respondWithError(w, http.StatusBadRequest, "Search term is required")
		return
	}

	sets, err := h.repo.Search(searchTerm)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	respondWithJSON(w, http.StatusOK, sets)
}

// UpdateLegoSet handles PUT /api/lego-sets/{id}
func (h *LegoSetHandler) UpdateLegoSet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Check if set exists
	existing, err := h.repo.GetByID(id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if existing == nil {
		respondWithError(w, http.StatusNotFound, "Set not found")
		return
	}

	var req models.UpdateLegoSetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Build updates map
	updates := make(map[string]interface{})

	if req.SetNumber != nil {
		// Check if new set number already exists
		if *req.SetNumber != existing.SetNumber {
			duplicate, err := h.repo.GetBySetNumber(*req.SetNumber)
			if err != nil {
				respondWithError(w, http.StatusInternalServerError, "Database error")
				return
			}
			if duplicate != nil {
				respondWithError(w, http.StatusConflict, "Set number already exists")
				return
			}
		}
		updates["set_number"] = *req.SetNumber
	}
	if req.AlternateSetNumber != nil {
		updates["alternate_set_number"] = *req.AlternateSetNumber
	}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Owned != nil {
		updates["owned"] = *req.Owned
	}
	if req.QuantityOwned != nil {
		updates["quantity_owned"] = *req.QuantityOwned
	}
	if req.ReleaseYear != nil {
		updates["release_year"] = *req.ReleaseYear
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Series != nil {
		updates["series"] = *req.Series
	}
	if req.NumParts != nil {
		updates["num_parts"] = *req.NumParts
	}
	if req.NumMinifigs != nil {
		updates["num_minifigs"] = *req.NumMinifigs
	}
	if req.BricklinkURL != nil {
		updates["bricklink_url"] = *req.BricklinkURL
	}
	if req.ApproximateValue != nil {
		updates["approximate_value"] = *req.ApproximateValue
	}
	if req.ValueLastUpdated != nil {
		if *req.ValueLastUpdated != "" {
			t, err := time.Parse("2006-01-02", *req.ValueLastUpdated)
			if err == nil {
				updates["value_last_updated"] = t
			}
		}
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}

	// Update the set
	if err := h.repo.Update(id, updates); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update set")
		return
	}

	// Fetch and return updated set
	updatedSet, err := h.repo.GetByID(id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	respondWithJSON(w, http.StatusOK, updatedSet)
}

// DeleteLegoSet handles DELETE /api/lego-sets/{id}
func (h *LegoSetHandler) DeleteLegoSet(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Get the set to delete associated image
	set, err := h.repo.GetByID(id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if set == nil {
		respondWithError(w, http.StatusNotFound, "Set not found")
		return
	}

	// Delete image if exists
	if set.ImageFilename != nil {
		h.imageService.DeleteImage(*set.ImageFilename)
	}

	// Delete the set
	if err := h.repo.Delete(id); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete set")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UploadImage handles POST /api/lego-sets/{id}/image
func (h *LegoSetHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Check if set exists
	set, err := h.repo.GetByID(id)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if set == nil {
		respondWithError(w, http.StatusNotFound, "Set not found")
		return
	}

	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondWithError(w, http.StatusBadRequest, "Failed to parse form")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Image file is required")
		return
	}
	defer file.Close()

	// Delete old image if exists
	if set.ImageFilename != nil {
		h.imageService.DeleteImage(*set.ImageFilename)
	}

	// Save new image
	filename, err := h.imageService.SaveImage(file, header, id, set.SetNumber)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to save image: %v", err))
		return
	}

	// Update set with new image filename
	updates := map[string]interface{}{
		"image_filename": filename,
	}
	if err := h.repo.Update(id, updates); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update set")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{"imageFilename": filename})
}

// GetStatistics handles GET /api/statistics
func (h *LegoSetHandler) GetStatistics(w http.ResponseWriter, r *http.Request) {
	stats, err := h.repo.GetStatistics()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to get statistics")
		return
	}

	respondWithJSON(w, http.StatusOK, stats)
}

// ExportCSV handles GET /api/lego-sets/export
func (h *LegoSetHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	sets, err := h.repo.GetAll(nil, "", "")
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=lego_sets.csv")

	if err := h.csvService.ExportToCSV(sets, w); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to export CSV")
		return
	}
}

// ImportCSV handles POST /api/lego-sets/import
func (h *LegoSetHandler) ImportCSV(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form (max 10MB)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondWithError(w, http.StatusBadRequest, "Failed to parse form")
		return
	}

	file, _, err := r.FormFile("csv")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "CSV file is required")
		return
	}
	defer file.Close()

	// Parse CSV
	sets, err := h.csvService.ImportFromCSV(file)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, fmt.Sprintf("Failed to parse CSV: %v", err))
		return
	}

	// Import each set
	imported := 0
	skipped := 0
	errors := []string{}

	for _, setReq := range sets {
		// Check if set already exists
		existing, err := h.repo.GetBySetNumber(setReq.SetNumber)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Error checking set %s: %v", setReq.SetNumber, err))
			continue
		}

		if existing != nil {
			skipped++
			continue
		}

		// Convert request to model
		set := &models.LegoSet{
			SetNumber:          setReq.SetNumber,
			AlternateSetNumber: setReq.AlternateSetNumber,
			Title:              setReq.Title,
			Owned:              setReq.Owned,
			QuantityOwned:      setReq.QuantityOwned,
			ReleaseYear:        setReq.ReleaseYear,
			Description:        setReq.Description,
			Series:             setReq.Series,
			NumParts:           setReq.NumParts,
			NumMinifigs:        setReq.NumMinifigs,
			BricklinkURL:       setReq.BricklinkURL,
			ApproximateValue:   setReq.ApproximateValue,
			Notes:              setReq.Notes,
		}

		// Parse value last updated date
		if setReq.ValueLastUpdated != nil && *setReq.ValueLastUpdated != "" {
			t, err := time.Parse("2006-01-02", *setReq.ValueLastUpdated)
			if err == nil {
				set.ValueLastUpdated = &t
			}
		}

		if err := h.repo.Create(set); err != nil {
			errors = append(errors, fmt.Sprintf("Error importing set %s: %v", setReq.SetNumber, err))
			continue
		}

		imported++
	}

	result := map[string]interface{}{
		"imported": imported,
		"skipped":  skipped,
		"errors":   errors,
	}

	respondWithJSON(w, http.StatusOK, result)
}

// GetAllSeries handles GET /api/series
func (h *LegoSetHandler) GetAllSeries(w http.ResponseWriter, r *http.Request) {
	series, err := h.repo.GetAllSeries()
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Database error")
		return
	}

	respondWithJSON(w, http.StatusOK, series)
}

// Helper functions
func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
