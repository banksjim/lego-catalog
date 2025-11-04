package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
)

// ImageService handles image storage operations
type ImageService struct {
	uploadDir string
}

// NewImageService creates a new image service
func NewImageService(uploadDir string) *ImageService {
	return &ImageService{
		uploadDir: uploadDir,
	}
}

// SaveImage saves an uploaded image file
func (s *ImageService) SaveImage(file multipart.File, header *multipart.FileHeader, id, setNumber string) (string, error) {
	// Ensure upload directory exists
	if err := os.MkdirAll(s.uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Get file extension
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg" // default extension
	}

	// Validate file extension
	validExtensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}

	if !validExtensions[strings.ToLower(ext)] {
		return "", fmt.Errorf("invalid file type: %s (allowed: jpg, jpeg, png, gif, webp)", ext)
	}

	// Create filename: GUID_SetNumber.ext
	filename := fmt.Sprintf("%s_%s%s", id, sanitizeFilename(setNumber), ext)
	filepath := filepath.Join(s.uploadDir, filename)

	// Create the file
	dst, err := os.Create(filepath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy the uploaded file to the destination
	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return filename, nil
}

// DeleteImage removes an image file
func (s *ImageService) DeleteImage(filename string) error {
	if filename == "" {
		return nil
	}

	filepath := filepath.Join(s.uploadDir, filename)
	if err := os.Remove(filepath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete image: %w", err)
	}

	return nil
}

// GetImagePath returns the full path to an image file
func (s *ImageService) GetImagePath(filename string) string {
	if filename == "" {
		return ""
	}
	return filepath.Join(s.uploadDir, filename)
}

// sanitizeFilename removes or replaces invalid characters from filename
func sanitizeFilename(filename string) string {
	// Replace invalid characters with underscores
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", "_",
		"*", "_",
		"?", "_",
		"\"", "_",
		"<", "_",
		">", "_",
		"|", "_",
		" ", "_",
	)
	return replacer.Replace(filename)
}
