package tests

import (
	"bytes"
	"strings"
	"testing"

	"lego-catalog/internal/models"
	"lego-catalog/internal/services"
)

func TestCSVService_ExportToCSV(t *testing.T) {
	csvService := services.NewCSVService()

	year := 2020
	desc := "Roman Colosseum"
	series := "Creator Expert"
	url := "https://www.bricklink.com/v2/catalog/catalogitem.page?S=10276-1"
	value := 549.99
	notes := "Awesome set!"

	sets := []*models.LegoSet{
		{
			SetNumber:        "10276",
			Title:            "Colosseum",
			Owned:            true,
			QuantityOwned:    1,
			ReleaseYear:      &year,
			Description:      &desc,
			Series:           &series,
			NumParts:         9036,
			NumMinifigs:      0,
			BricklinkURL:     &url,
			ApproximateValue: &value,
			Notes:            &notes,
		},
	}

	var buf bytes.Buffer
	err := csvService.ExportToCSV(sets, &buf)
	if err != nil {
		t.Fatalf("Failed to export CSV: %v", err)
	}

	csvContent := buf.String()

	// Check that CSV contains expected data
	if !strings.Contains(csvContent, "10276") {
		t.Error("CSV should contain set number")
	}
	if !strings.Contains(csvContent, "Colosseum") {
		t.Error("CSV should contain set title")
	}
	if !strings.Contains(csvContent, "Creator Expert") {
		t.Error("CSV should contain series")
	}
}

func TestCSVService_ImportFromCSV(t *testing.T) {
	csvService := services.NewCSVService()

	csvData := `Set Number,Alternate Set Number,Title,Owned,Quantity Owned,Release Year,Description,Series,Number of Parts,Number of Minifigs,Bricklink URL,Approximate Value,Value Last Updated,Notes
10276,,Colosseum,true,1,2020,Roman Colosseum,Creator Expert,9036,0,https://www.bricklink.com/v2/catalog/catalogitem.page?S=10276-1,549.99,2024-01-15,Awesome set!
75192,,Millennium Falcon,false,0,2017,UCS Millennium Falcon,Star Wars,7541,8,https://www.bricklink.com/v2/catalog/catalogitem.page?S=75192-1,849.99,2024-01-10,Want to buy`

	reader := strings.NewReader(csvData)
	sets, err := csvService.ImportFromCSV(reader)
	if err != nil {
		t.Fatalf("Failed to import CSV: %v", err)
	}

	if len(sets) != 2 {
		t.Errorf("Expected 2 sets, got %d", len(sets))
	}

	// Check first set
	if sets[0].SetNumber != "10276" {
		t.Errorf("Expected set number 10276, got %s", sets[0].SetNumber)
	}
	if sets[0].Title != "Colosseum" {
		t.Errorf("Expected title Colosseum, got %s", sets[0].Title)
	}
	if !sets[0].Owned {
		t.Error("Expected first set to be owned")
	}
	if sets[0].QuantityOwned != 1 {
		t.Errorf("Expected quantity owned 1, got %d", sets[0].QuantityOwned)
	}

	// Check second set
	if sets[1].SetNumber != "75192" {
		t.Errorf("Expected set number 75192, got %s", sets[1].SetNumber)
	}
	if sets[1].Owned {
		t.Error("Expected second set to not be owned")
	}
}

func TestCSVService_ImportFromCSV_InvalidFormat(t *testing.T) {
	csvService := services.NewCSVService()

	csvData := `Invalid,Header,Format
10276,Colosseum,true`

	reader := strings.NewReader(csvData)
	_, err := csvService.ImportFromCSV(reader)
	if err == nil {
		t.Error("Expected error for invalid CSV format")
	}
}
