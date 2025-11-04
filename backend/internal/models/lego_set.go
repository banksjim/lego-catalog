package models

import (
	"time"
)

// LegoSet represents a Lego set in the database
type LegoSet struct {
	ID                  string     `json:"id" db:"id"`
	SetNumber           string     `json:"setNumber" db:"set_number"`
	AlternateSetNumber  *string    `json:"alternateSetNumber,omitempty" db:"alternate_set_number"`
	Title               string     `json:"title" db:"title"`
	Owned               bool       `json:"owned" db:"owned"`
	QuantityOwned       int        `json:"quantityOwned" db:"quantity_owned"`
	ReleaseYear         *int       `json:"releaseYear,omitempty" db:"release_year"`
	Description         *string    `json:"description,omitempty" db:"description"`
	Series              *string    `json:"series,omitempty" db:"series"`
	NumParts            int        `json:"numParts" db:"num_parts"`
	NumMinifigs         int        `json:"numMinifigs" db:"num_minifigs"`
	BricklinkURL        *string    `json:"bricklinkUrl,omitempty" db:"bricklink_url"`
	RebrickableURL      *string    `json:"rebrickableUrl,omitempty" db:"rebrickable_url"`
	ApproximateValue    *float64   `json:"approximateValue,omitempty" db:"approximate_value"`
	ValueLastUpdated    *time.Time `json:"valueLastUpdated,omitempty" db:"value_last_updated"`
	ConditionDescription *string   `json:"conditionDescription,omitempty" db:"condition_description"`
	ImageFilename       *string    `json:"imageFilename,omitempty" db:"image_filename"`
	Notes               *string    `json:"notes,omitempty" db:"notes"`
	CreatedAt           time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time  `json:"updatedAt" db:"updated_at"`
}

// CreateLegoSetRequest represents the request body for creating a new Lego set
type CreateLegoSetRequest struct {
	SetNumber          string   `json:"setNumber" binding:"required"`
	AlternateSetNumber *string  `json:"alternateSetNumber,omitempty"`
	Title              string   `json:"title" binding:"required"`
	Owned              bool     `json:"owned"`
	QuantityOwned      int      `json:"quantityOwned"`
	ReleaseYear        *int     `json:"releaseYear,omitempty"`
	Description        *string  `json:"description,omitempty"`
	Series             *string  `json:"series,omitempty"`
	NumParts             int      `json:"numParts"`
	NumMinifigs          int      `json:"numMinifigs"`
	BricklinkURL         *string  `json:"bricklinkUrl,omitempty"`
	RebrickableURL       *string  `json:"rebrickableUrl,omitempty"`
	ApproximateValue     *float64 `json:"approximateValue,omitempty"`
	ValueLastUpdated     *string  `json:"valueLastUpdated,omitempty"`
	ConditionDescription *string  `json:"conditionDescription,omitempty"`
	Notes                *string  `json:"notes,omitempty"`
}

// UpdateLegoSetRequest represents the request body for updating a Lego set
type UpdateLegoSetRequest struct {
	SetNumber          *string  `json:"setNumber,omitempty"`
	AlternateSetNumber *string  `json:"alternateSetNumber,omitempty"`
	Title              *string  `json:"title,omitempty"`
	Owned              *bool    `json:"owned,omitempty"`
	QuantityOwned      *int     `json:"quantityOwned,omitempty"`
	ReleaseYear        *int     `json:"releaseYear,omitempty"`
	Description        *string  `json:"description,omitempty"`
	Series             *string  `json:"series,omitempty"`
	NumParts             *int     `json:"numParts,omitempty"`
	NumMinifigs          *int     `json:"numMinifigs,omitempty"`
	BricklinkURL         *string  `json:"bricklinkUrl,omitempty"`
	RebrickableURL       *string  `json:"rebrickableUrl,omitempty"`
	ApproximateValue     *float64 `json:"approximateValue,omitempty"`
	ValueLastUpdated     *string  `json:"valueLastUpdated,omitempty"`
	ConditionDescription *string  `json:"conditionDescription,omitempty"`
	Notes                *string  `json:"notes,omitempty"`
}

// Statistics represents aggregate statistics for the collection
type Statistics struct {
	TotalSets          int     `json:"totalSets"`
	OwnedSets          int     `json:"ownedSets"`
	TotalPieces        int     `json:"totalPieces"`
	TotalMinifigs      int     `json:"totalMinifigs"`
	TotalValue         float64 `json:"totalValue"`
	AverageValue       float64 `json:"averageValue"`
	MostExpensiveSet   *LegoSet `json:"mostExpensiveSet,omitempty"`
	LargestSet         *LegoSet `json:"largestSet,omitempty"`
	OldestSet          *LegoSet `json:"oldestSet,omitempty"`
	NewestSet          *LegoSet `json:"newestSet,omitempty"`
}
