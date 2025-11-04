package db

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"lego-catalog/internal/models"

	"github.com/google/uuid"
)

// LegoSetRepository handles database operations for Lego sets
type LegoSetRepository struct {
	db *Database
}

// NewLegoSetRepository creates a new repository
func NewLegoSetRepository(db *Database) *LegoSetRepository {
	return &LegoSetRepository{db: db}
}

// Create inserts a new Lego set into the database
func (r *LegoSetRepository) Create(set *models.LegoSet) error {
	query := `
		INSERT INTO lego_sets (
			id, set_number, alternate_set_number, title, owned, quantity_owned,
			release_year, description, series, num_parts, num_minifigs,
			bricklink_url, rebrickable_url, approximate_value, value_last_updated,
			condition_description, image_filename, notes
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	set.ID = uuid.New().String()
	set.CreatedAt = time.Now()
	set.UpdatedAt = time.Now()

	_, err := r.db.Exec(query,
		set.ID, set.SetNumber, set.AlternateSetNumber, set.Title, set.Owned, set.QuantityOwned,
		set.ReleaseYear, set.Description, set.Series, set.NumParts, set.NumMinifigs,
		set.BricklinkURL, set.RebrickableURL, set.ApproximateValue, set.ValueLastUpdated,
		set.ConditionDescription, set.ImageFilename, set.Notes,
	)

	return err
}

// GetByID retrieves a Lego set by its ID
func (r *LegoSetRepository) GetByID(id string) (*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE id = ?
	`

	set := &models.LegoSet{}
	err := r.db.QueryRow(query, id).Scan(
		&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
		&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
		&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
		&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return set, nil
}

// GetBySetNumber retrieves a Lego set by its set number
func (r *LegoSetRepository) GetBySetNumber(setNumber string) (*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE set_number = ?
	`

	set := &models.LegoSet{}
	err := r.db.QueryRow(query, setNumber).Scan(
		&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
		&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
		&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
		&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return set, nil
}

// GetAll retrieves all Lego sets with optional filtering and sorting
func (r *LegoSetRepository) GetAll(filters map[string]interface{}, sortBy, sortOrder string) ([]*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE 1=1
	`
	args := []interface{}{}

	// Apply filters
	if series, ok := filters["series"].(string); ok && series != "" {
		query += " AND series = ?"
		args = append(args, series)
	}

	if owned, ok := filters["owned"].(bool); ok {
		query += " AND owned = ?"
		args = append(args, owned)
	}

	// Apply sorting
	validSortFields := map[string]bool{
		"title":             true,
		"set_number":        true,
		"release_year":      true,
		"approximate_value": true,
		"num_parts":         true,
		"created_at":        true,
	}

	if sortBy != "" && validSortFields[sortBy] {
		order := "ASC"
		if strings.ToUpper(sortOrder) == "DESC" {
			order = "DESC"
		}
		query += fmt.Sprintf(" ORDER BY %s %s", sortBy, order)
	} else {
		query += " ORDER BY created_at DESC"
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sets := []*models.LegoSet{}
	for rows.Next() {
		set := &models.LegoSet{}
		err := rows.Scan(
			&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
			&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
			&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
			&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		sets = append(sets, set)
	}

	return sets, nil
}

// Search searches for Lego sets across multiple fields
func (r *LegoSetRepository) Search(searchTerm string) ([]*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE set_number LIKE ?
		   OR title LIKE ?
		   OR description LIKE ?
		   OR series LIKE ?
		   OR notes LIKE ?
		ORDER BY title ASC
	`

	searchPattern := "%" + searchTerm + "%"
	rows, err := r.db.Query(query, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sets := []*models.LegoSet{}
	for rows.Next() {
		set := &models.LegoSet{}
		err := rows.Scan(
			&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
			&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
			&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
			&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		sets = append(sets, set)
	}

	return sets, nil
}

// Update updates an existing Lego set
func (r *LegoSetRepository) Update(id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	query := "UPDATE lego_sets SET "
	args := []interface{}{}
	setClauses := []string{}

	for key, value := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		args = append(args, value)
	}

	query += strings.Join(setClauses, ", ")
	query += ", updated_at = ? WHERE id = ?"
	args = append(args, time.Now(), id)

	result, err := r.db.Exec(query, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no rows updated")
	}

	return nil
}

// Delete removes a Lego set from the database
func (r *LegoSetRepository) Delete(id string) error {
	query := "DELETE FROM lego_sets WHERE id = ?"
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no rows deleted")
	}

	return nil
}

// GetStatistics retrieves aggregate statistics for the collection
func (r *LegoSetRepository) GetStatistics() (*models.Statistics, error) {
	stats := &models.Statistics{}

	// Get basic counts and totals for owned sets
	query := `
		SELECT
			COUNT(*) as total_sets,
			COALESCE(SUM(CASE WHEN owned = true THEN 1 ELSE 0 END), 0) as owned_sets,
			COALESCE(SUM(CASE WHEN owned = true THEN num_parts * quantity_owned ELSE 0 END), 0) as total_pieces,
			COALESCE(SUM(CASE WHEN owned = true THEN num_minifigs * quantity_owned ELSE 0 END), 0) as total_minifigs,
			COALESCE(SUM(CASE WHEN owned = true THEN approximate_value * quantity_owned ELSE 0 END), 0) as total_value
		FROM lego_sets
	`

	var totalValue sql.NullFloat64
	err := r.db.QueryRow(query).Scan(
		&stats.TotalSets,
		&stats.OwnedSets,
		&stats.TotalPieces,
		&stats.TotalMinifigs,
		&totalValue,
	)
	if err != nil {
		return nil, err
	}

	if totalValue.Valid {
		stats.TotalValue = totalValue.Float64
	}

	// Calculate average value
	if stats.OwnedSets > 0 {
		stats.AverageValue = stats.TotalValue / float64(stats.OwnedSets)
	}

	// Get most expensive set
	mostExpensiveSet, err := r.getMostExpensiveSet()
	if err == nil {
		stats.MostExpensiveSet = mostExpensiveSet
	}

	// Get largest set by parts
	largestSet, err := r.getLargestSet()
	if err == nil {
		stats.LargestSet = largestSet
	}

	// Get oldest set
	oldestSet, err := r.getOldestSet()
	if err == nil {
		stats.OldestSet = oldestSet
	}

	// Get newest set
	newestSet, err := r.getNewestSet()
	if err == nil {
		stats.NewestSet = newestSet
	}

	return stats, nil
}

func (r *LegoSetRepository) getMostExpensiveSet() (*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE owned = true AND approximate_value IS NOT NULL
		ORDER BY approximate_value DESC
		LIMIT 1
	`

	set := &models.LegoSet{}
	err := r.db.QueryRow(query).Scan(
		&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
		&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
		&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
		&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return set, nil
}

func (r *LegoSetRepository) getLargestSet() (*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE owned = true
		ORDER BY num_parts DESC
		LIMIT 1
	`

	set := &models.LegoSet{}
	err := r.db.QueryRow(query).Scan(
		&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
		&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
		&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
		&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return set, nil
}

func (r *LegoSetRepository) getOldestSet() (*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE owned = true AND release_year IS NOT NULL
		ORDER BY release_year ASC
		LIMIT 1
	`

	set := &models.LegoSet{}
	err := r.db.QueryRow(query).Scan(
		&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
		&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
		&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
		&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return set, nil
}

func (r *LegoSetRepository) getNewestSet() (*models.LegoSet, error) {
	query := `
		SELECT id, set_number, alternate_set_number, title, owned, quantity_owned,
		       release_year, description, series, num_parts, num_minifigs,
		       bricklink_url, rebrickable_url, approximate_value, value_last_updated,
		       condition_description, image_filename, notes, created_at, updated_at
		FROM lego_sets
		WHERE owned = true AND release_year IS NOT NULL
		ORDER BY release_year DESC
		LIMIT 1
	`

	set := &models.LegoSet{}
	err := r.db.QueryRow(query).Scan(
		&set.ID, &set.SetNumber, &set.AlternateSetNumber, &set.Title, &set.Owned, &set.QuantityOwned,
		&set.ReleaseYear, &set.Description, &set.Series, &set.NumParts, &set.NumMinifigs,
		&set.BricklinkURL, &set.RebrickableURL, &set.ApproximateValue, &set.ValueLastUpdated,
		&set.ConditionDescription, &set.ImageFilename, &set.Notes, &set.CreatedAt, &set.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return set, nil
}

// GetAllSeries retrieves all unique series names
func (r *LegoSetRepository) GetAllSeries() ([]string, error) {
	query := `
		SELECT DISTINCT series
		FROM lego_sets
		WHERE series IS NOT NULL AND series != ''
		ORDER BY series ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	series := []string{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		series = append(series, s)
	}

	return series, nil
}
