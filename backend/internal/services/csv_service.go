package services

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"time"

	"lego-catalog/internal/models"
)

// CSVService handles CSV import/export operations
type CSVService struct{}

// NewCSVService creates a new CSV service
func NewCSVService() *CSVService {
	return &CSVService{}
}

// ExportToCSV converts Lego sets to CSV format
func (s *CSVService) ExportToCSV(sets []*models.LegoSet, writer io.Writer) error {
	csvWriter := csv.NewWriter(writer)
	defer csvWriter.Flush()

	// Write header
	header := []string{
		"Set Number", "Alternate Set Number", "Title", "Owned", "Quantity Owned",
		"Release Year", "Description", "Series", "Number of Parts", "Number of Minifigs",
		"Bricklink URL", "Approximate Value", "Value Last Updated", "Notes",
	}
	if err := csvWriter.Write(header); err != nil {
		return err
	}

	// Write data rows
	for _, set := range sets {
		row := []string{
			set.SetNumber,
			stringOrEmpty(set.AlternateSetNumber),
			set.Title,
			boolToString(set.Owned),
			strconv.Itoa(set.QuantityOwned),
			intPtrToString(set.ReleaseYear),
			stringOrEmpty(set.Description),
			stringOrEmpty(set.Series),
			strconv.Itoa(set.NumParts),
			strconv.Itoa(set.NumMinifigs),
			stringOrEmpty(set.BricklinkURL),
			float64PtrToString(set.ApproximateValue),
			timePtrToString(set.ValueLastUpdated),
			stringOrEmpty(set.Notes),
		}
		if err := csvWriter.Write(row); err != nil {
			return err
		}
	}

	return nil
}

// ImportFromCSV parses CSV data and returns Lego sets
func (s *CSVService) ImportFromCSV(reader io.Reader) ([]*models.CreateLegoSetRequest, error) {
	csvReader := csv.NewReader(reader)

	// Read header
	header, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}

	// Validate header
	expectedHeader := []string{
		"Set Number", "Alternate Set Number", "Title", "Owned", "Quantity Owned",
		"Release Year", "Description", "Series", "Number of Parts", "Number of Minifigs",
		"Bricklink URL", "Approximate Value", "Value Last Updated", "Notes",
	}

	if len(header) != len(expectedHeader) {
		return nil, fmt.Errorf("invalid CSV format: expected %d columns, got %d", len(expectedHeader), len(header))
	}

	sets := []*models.CreateLegoSetRequest{}
	lineNum := 1

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading CSV line %d: %w", lineNum+1, err)
		}

		lineNum++

		// Skip empty rows
		if len(record) == 0 || record[0] == "" {
			continue
		}

		set := &models.CreateLegoSetRequest{
			SetNumber:          record[0],
			AlternateSetNumber: stringToPtr(record[1]),
			Title:              record[2],
			Owned:              stringToBool(record[3]),
			QuantityOwned:      stringToInt(record[4]),
			ReleaseYear:        stringToIntPtr(record[5]),
			Description:        stringToPtr(record[6]),
			Series:             stringToPtr(record[7]),
			NumParts:           stringToInt(record[8]),
			NumMinifigs:        stringToInt(record[9]),
			BricklinkURL:       stringToPtr(record[10]),
			ApproximateValue:   stringToFloat64Ptr(record[11]),
			ValueLastUpdated:   stringToPtr(record[12]),
			Notes:              stringToPtr(record[13]),
		}

		sets = append(sets, set)
	}

	return sets, nil
}

// Helper functions for type conversions
func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func intPtrToString(i *int) string {
	if i == nil {
		return ""
	}
	return strconv.Itoa(*i)
}

func float64PtrToString(f *float64) string {
	if f == nil {
		return ""
	}
	return fmt.Sprintf("%.2f", *f)
}

func timePtrToString(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02")
}

func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func stringToIntPtr(s string) *int {
	if s == "" {
		return nil
	}
	i, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &i
}

func stringToFloat64Ptr(s string) *float64 {
	if s == "" {
		return nil
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &f
}

func stringToInt(s string) int {
	i, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return i
}

func stringToBool(s string) bool {
	return s == "true" || s == "True" || s == "TRUE" || s == "1"
}
