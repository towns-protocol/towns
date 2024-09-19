package utils

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/crypto"
	"gopkg.in/yaml.v2"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

const (
	dirPermissions  = 0o755
	filePermissions = 0o644
)

type DiamondReport struct {
	Name              string      `yaml:"name"`
	SourceEnvironment string      `yaml:"sourceEnvironment"`
	TargetEnvironment string      `yaml:"targetEnvironment"`
	Facets            []FacetDiff `yaml:"facets"`
}

type FacetSourceDiff struct {
	FacetName       string `yaml:"facetName"`
	DeployedAddress string `yaml:"deployedAddress"`
	SourceHash      string `yaml:"sourceHash"`
}

type SourceFacetDiff struct {
	Diamond   string            `yaml:"diamond"`
	Facets    []FacetSourceDiff `yaml:"facets"`
	NumFacets uint              `yaml:"numFacets"`
}

type SourceDiffReport struct {
	Environment        string            `yaml:"environment"`
	CurrentCommitHash  string            `yaml:"currentCommitHash"`
	PreviousCommitHash string            `yaml:"previousCommitHash"`
	Updated            []SourceFacetDiff `yaml:"updated"`
	Existing           []SourceFacetDiff `yaml:"existing"`
	NumUpdated         uint              `yaml:"numUpdated"`
	NumExisting        uint              `yaml:"numExisting"`
}

type (
	FacetName   string
	DiamondName string
)

type CommitHashes struct {
	Previous string `yaml:"previous"`
	Current  string `yaml:"current"`
}

type Data struct {
	Updated  map[FacetName]string `yaml:"updated"`
	Existing map[FacetName]string `yaml:"existing"`
}

type FacetFile struct {
	Path     string
	Filename string
}

type Diamond string

const (
	BaseRegistry Diamond = "baseRegistry"
	Space        Diamond = "space"
	SpaceFactory Diamond = "spaceFactory"
	SpaceOwner   Diamond = "spaceOwner"
)

// GetFacetFiles walks the given path and returns a slice of FacetFile structs
// containing information about the facet files.
func GetFacetFiles(facetSourcePath string) ([]FacetFile, error) {
	var facetFiles []FacetFile

	err := filepath.Walk(facetSourcePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if strings.Contains(path, "facets") {
			if !info.IsDir() && strings.HasSuffix(info.Name(), ".sol") && !strings.HasPrefix(info.Name(), "I") {
				facetFiles = append(facetFiles, FacetFile{
					Path:     path,
					Filename: info.Name(),
				})
			}
		}

		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("error walking the path %v: %w", facetSourcePath, err)
	}

	return facetFiles, nil
}

// GetCompiledFacetHashes reads compiled facet files from the given path and calculates
// their Keccak256 hashes. It returns a map where the keys are the original filenames
// (without the .bin extension) and the values are the corresponding hashes.
func GetCompiledFacetHashes(path string, files []FacetFile) (map[FacetName]string, error) {
	result := make(map[FacetName]string)

	for _, files := range files {
		rootPath := filepath.Join(path, files.Filename)
		err := filepath.Walk(rootPath, func(currentPath string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && strings.HasSuffix(info.Name(), ".bin") {
				if data, err := os.ReadFile(currentPath); err == nil {
					hash := crypto.Keccak256Hash(data).Hex()
					originalFilename := strings.TrimSuffix(info.Name(), ".bin")
					result[FacetName(originalFilename)] = hash
				}
			}

			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	return result, nil
}

// CreateFacetHashesReport generates a report comparing compiled facet hashes with existing ones.
// It categorizes hashes as updated or existing, and writes the report to a YAML file.
// The function can output to either a local directory or an S3 bucket.
func CreateFacetHashesReport(
	compiledFacetsPath string,
	compiledHashes map[FacetName]string,
	alphaFacets map[DiamondName][]Facet,
	outputPath string,
	environment string,
	verbose bool,
) error {
	var err error
	// Get current git commit hash
	cmd := exec.Command("git", "rev-parse", "--short", "HEAD")
	commitHashRaw, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("error getting git commit hash: %w", err)
	}
	commitHash := strings.TrimSpace(string(commitHashRaw))

	// Get current date in MMDDYYYY format
	currentDate := time.Now().UTC().Format("01022006")

	var previousReport SourceDiffReport
	var s3Client *s3.Client
	var cfg aws.Config

	if strings.HasPrefix(outputPath, "s3://") {
		// Create S3 client
		cfg, err = config.LoadDefaultConfig(context.TODO())
		if err != nil {
			return fmt.Errorf("unable to load SDK config: %w", err)
		}
		s3Client = s3.NewFromConfig(cfg)

		previousReport, err = getLatestYamlFileFromS3(s3Client, outputPath, commitHash)
	} else {
		previousReport, err = getLatestYamlFile(outputPath, commitHash)
	}
	if err != nil {
		return err
	}

	commitHashes := CommitHashes{
		Previous: previousReport.CurrentCommitHash,
		Current:  commitHash,
	}
	report := generateReport(previousReport, compiledHashes, alphaFacets, environment, commitHashes)

	if strings.HasPrefix(outputPath, "s3://") {
		return writeYamlReportToS3(s3Client, outputPath, report, commitHash, currentDate, verbose)
	}
	return writeYamlReport(outputPath, report, commitHash, currentDate, verbose)
}

func generateReport(
	previousReport SourceDiffReport,
	currentHashes map[FacetName]string,
	envFacets map[DiamondName][]Facet,
	environment string,
	commitHashes CommitHashes,
) SourceDiffReport {
	report := SourceDiffReport{
		Environment:        environment,
		CurrentCommitHash:  commitHashes.Current,
		PreviousCommitHash: commitHashes.Previous,
		Updated:            []SourceFacetDiff{},
		Existing:           []SourceFacetDiff{},
	}

	for diamond, facets := range envFacets {
		updatedFacets := []FacetSourceDiff{}
		existingFacets := []FacetSourceDiff{}

		for _, facet := range facets {
			facetName := FacetName(facet.ContractName)
			currentHash, exists := currentHashes[facetName]
			if !exists {
				continue // Skip if the facet is not in the compiled hashes
			}

			facetSourceDiff := FacetSourceDiff{
				FacetName:       facet.ContractName,
				DeployedAddress: facet.FacetAddress.Hex(),
				SourceHash:      currentHash,
			}

			prevFacet := findPreviousDiff(previousReport, string(diamond), facet.ContractName)
			if prevFacet == nil || prevFacet.SourceHash != currentHash {
				updatedFacets = append(updatedFacets, facetSourceDiff)
			} else {
				existingFacets = append(existingFacets, facetSourceDiff)
			}
		}

		if len(updatedFacets) > 0 {
			report.Updated = append(report.Updated, SourceFacetDiff{
				Diamond:   string(diamond),
				Facets:    updatedFacets,
				NumFacets: uint(len(updatedFacets)),
			})
		}
		if len(existingFacets) > 0 {
			report.Existing = append(report.Existing, SourceFacetDiff{
				Diamond:   string(diamond),
				Facets:    existingFacets,
				NumFacets: uint(len(existingFacets)),
			})
		}
	}

	// Calculate NumUpdated and NumExisting
	report.NumUpdated = uint(len(report.Updated))
	report.NumExisting = uint(len(report.Existing))

	return report
}

func findPreviousDiff(previousReport SourceDiffReport, diamond string, facetName string) *FacetSourceDiff {
	for _, sourceFacetDiff := range previousReport.Updated {
		if sourceFacetDiff.Diamond == diamond {
			for _, facet := range sourceFacetDiff.Facets {
				if facet.FacetName == facetName {
					return &facet
				}
			}
		}
	}
	for _, sourceFacetDiff := range previousReport.Existing {
		if sourceFacetDiff.Diamond == diamond {
			for _, facet := range sourceFacetDiff.Facets {
				if facet.FacetName == facetName {
					return &facet
				}
			}
		}
	}
	return nil
}

func writeYamlReport(
	yamlOutputDir string,
	report SourceDiffReport,
	commitHash, currentDate string,
	verbose bool,
) error {
	yamlContent, err := yaml.Marshal(report)
	if err != nil {
		return fmt.Errorf("error marshaling YAML content: %w", err)
	}

	// Convert relative path to absolute path
	absYamlOutputDir, err := filepath.Abs(yamlOutputDir)
	if err != nil {
		return fmt.Errorf("error getting absolute path: %w", err)
	}

	filename := fmt.Sprintf("%s_%s.yaml", commitHash, currentDate)
	fullPath := filepath.Join(absYamlOutputDir, filename)

	// Check if file already exists
	if _, err := os.Stat(fullPath); err == nil {
		// File exists, generate a unique name
		for i := 1; ; i++ {
			newFilename := fmt.Sprintf("%s_%s_%d.yaml", commitHash, currentDate, i)
			fullPath = filepath.Join(absYamlOutputDir, newFilename)
			if _, err := os.Stat(fullPath); os.IsNotExist(err) {
				break
			}
		}
	}

	// Ensure the output directory exists
	err = os.MkdirAll(absYamlOutputDir, dirPermissions)
	if err != nil {
		return fmt.Errorf("error creating output directory: %w", err)
	}

	// Write YAML file
	err = os.WriteFile(fullPath, yamlContent, filePermissions)
	if err != nil {
		return fmt.Errorf("error writing YAML file: %w", err)
	}

	if verbose {
		Log.Info().Msgf("YAML file created: %s", fullPath)
	}

	return nil
}

func writeYamlReportToS3(
	client *s3.Client,
	s3Path string,
	report SourceDiffReport,
	commitHash, currentDate string,
	verbose bool,
) error {
	// Parse bucket and key from s3Path
	parts := strings.SplitN(strings.TrimPrefix(s3Path, "s3://"), "/", 2)
	bucket := parts[0]
	keyPrefix := ""
	if len(parts) > 1 {
		keyPrefix = parts[1]
	}

	// Marshal report to YAML
	yamlContent, err := yaml.Marshal(report)
	if err != nil {
		return fmt.Errorf("error marshaling YAML content: %w", err)
	}

	// Generate filename
	filename := fmt.Sprintf("%s_%s.yaml", commitHash, currentDate)
	key := filename
	if keyPrefix != "" {
		key = filepath.Join(keyPrefix, filename)
	}

	// Upload file to S3
	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
		Body:   bytes.NewReader(yamlContent),
	})
	if err != nil {
		return fmt.Errorf("error uploading file to S3: %w", err)
	}

	if verbose {
		Log.Info().Msgf("YAML file uploaded to S3: s3://%s/%s", bucket, key)
	}

	return nil
}

func getLatestYamlFile(dir string, currentCommitHash string) (SourceDiffReport, error) {
	// Convert to absolute path
	absDir, err := filepath.Abs(dir)
	if err != nil {
		return SourceDiffReport{}, err
	}

	// Check if directory exists
	if _, err := os.Stat(absDir); os.IsNotExist(err) {
		// Directory doesn't exist, return empty string without error
		return SourceDiffReport{}, nil
	}

	files, err := os.ReadDir(absDir)
	if err != nil {
		return SourceDiffReport{}, err
	}

	var yamlFiles []os.DirEntry
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".yaml") {
			yamlFiles = append(yamlFiles, file)
		}
	}

	if len(yamlFiles) == 0 {
		// No YAML files found, return empty string without error
		return SourceDiffReport{}, nil
	}

	sort.Slice(yamlFiles, func(i, j int) bool {
		date1, _ := getDateFromFileName(yamlFiles[i].Name())
		date2, _ := getDateFromFileName(yamlFiles[j].Name())

		if date1 != date2 {
			return date1 > date2
		}

		// If dates are the same, compare modification times
		info1, _ := yamlFiles[i].Info()
		info2, _ := yamlFiles[j].Info()
		return info1.ModTime().After(info2.ModTime())
	})

	for _, file := range yamlFiles {
		commitHash := strings.Split(file.Name(), "_")[0]
		if commitHash != currentCommitHash {
			latestFile := filepath.Join(absDir, file.Name())

			// Read and unmarshal the YAML file
			data, err := os.ReadFile(latestFile)
			if err != nil {
				return SourceDiffReport{}, fmt.Errorf("error reading YAML file: %w", err)
			}

			var previousData SourceDiffReport
			err = yaml.Unmarshal(data, &previousData)
			if err != nil {
				return SourceDiffReport{}, fmt.Errorf("error unmarshaling YAML data: %w", err)
			}

			return previousData, nil
		}
	}

	return SourceDiffReport{}, nil // No file with a different commit hash found
}

func getLatestYamlFileFromS3(client *s3.Client, s3Path string, currentCommitHash string) (SourceDiffReport, error) {
	// Parse bucket and prefix from s3Path
	parts := strings.SplitN(strings.TrimPrefix(s3Path, "s3://"), "/", 2)
	bucket := parts[0]
	prefix := ""
	if len(parts) > 1 {
		prefix = parts[1]
	}

	// List objects in the bucket
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
	}
	if prefix != "" {
		input.Prefix = aws.String(prefix)
	}

	resp, err := client.ListObjectsV2(context.TODO(), input)
	if err != nil {
		return SourceDiffReport{}, fmt.Errorf("unable to list S3 objects: %w", err)
	}

	// Find the latest YAML file by date and last modified time
	var latestFiles []*types.Object
	var latestDate int

	for _, obj := range resp.Contents {
		if strings.HasSuffix(*obj.Key, ".yaml") {
			commitHash := strings.Split(filepath.Base(*obj.Key), "_")[0]
			if commitHash != currentCommitHash {
				date, _ := getDateFromFileName(*obj.Key)
				if date > latestDate {
					latestDate = date
					latestFiles = []*types.Object{&obj}
				} else if date == latestDate {
					latestFiles = append(latestFiles, &obj)
				}
			}
		}
	}

	if len(latestFiles) == 0 {
		return SourceDiffReport{}, nil
	}

	// If multiple files have the same latest date, choose the one with the latest modification time
	latestFile := latestFiles[0]
	for _, file := range latestFiles[1:] {
		if file.LastModified.After(*latestFile.LastModified) {
			latestFile = file
		}
	}

	// Download the file from S3
	result, err := client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    latestFile.Key,
	})
	if err != nil {
		return SourceDiffReport{}, fmt.Errorf("error downloading file from S3: %w", err)
	}
	defer result.Body.Close()

	// Read and unmarshal the YAML data
	data, err := io.ReadAll(result.Body)
	if err != nil {
		return SourceDiffReport{}, fmt.Errorf("error reading S3 object body: %w", err)
	}

	var previousData SourceDiffReport
	err = yaml.Unmarshal(data, &previousData)
	if err != nil {
		return SourceDiffReport{}, fmt.Errorf("error unmarshaling YAML data: %w", err)
	}

	return previousData, nil
}

// Helper function to extract date from filename in the form filename_MMDDYYYY.yaml
func getDateFromFileName(fileName string) (int, error) {
	parts := strings.Split(strings.TrimSuffix(filepath.Base(fileName), ".yaml"), "_")
	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid filename format")
	}
	return strconv.Atoi(parts[1])
}

func categorizeHashes(
	compiledHashes map[FacetName]string,
	previousHashes map[FacetName]string,
) (updatedHashes, existingHashes map[FacetName]string) {
	updatedHashes = make(map[FacetName]string)
	existingHashes = make(map[FacetName]string)

	for contract, hash := range compiledHashes {
		if prevHash, exists := previousHashes[contract]; !exists || prevHash != hash {
			updatedHashes[contract] = hash
		} else {
			existingHashes[contract] = hash
		}
	}

	return updatedHashes, existingHashes
}

func Contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func GetDiamondAddresses(basePath string, diamonds []Diamond, verbose bool) (map[Diamond]string, error) {
	diamondAddresses := make(map[Diamond]string)

	for _, diamond := range diamonds {
		filePath := filepath.Join(basePath, "base", "addresses", fmt.Sprintf("%s.json", diamond))

		data, err := os.ReadFile(filePath)
		if err != nil {
			Log.Error().Err(err).Msgf("Error reading file %s", filePath)
			continue
		}

		var addressData struct {
			Address string `json:"address"`
		}

		if err := json.Unmarshal(data, &addressData); err != nil {
			Log.Error().Err(err).Msgf("Error unmarshaling JSON from file %s", filePath)
			continue
		}

		diamondAddresses[diamond] = addressData.Address
	}

	return diamondAddresses, nil
}

func GenerateYAMLReport(
	sourceEnvironment, targetEnvironment string,
	facetDiffs map[string][]FacetDiff,
	reportOutDir string,
) error {
	type Report struct {
		Diamonds []DiamondReport `yaml:"diamonds"`
	}

	var report Report

	for diamondName, diffs := range facetDiffs {
		diamondReport := DiamondReport{
			Name:              diamondName,
			SourceEnvironment: sourceEnvironment,
			TargetEnvironment: targetEnvironment,
			Facets:            diffs,
		}
		report.Diamonds = append(report.Diamonds, diamondReport)
	}

	// Create filename with date and incremental integer
	date := time.Now().Format("010206")
	var filename string
	for i := 1; ; i++ {
		filename = filepath.Join(reportOutDir, fmt.Sprintf("facet_diff_%s_%d.yaml", date, i))
		if _, err := os.Stat(filename); os.IsNotExist(err) {
			break
		}
	}

	// Ensure the directory exists
	err := os.MkdirAll(filepath.Dir(filename), 0755)
	if err != nil {
		return err
	}

	// Write YAML file
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := yaml.NewEncoder(file)
	err = encoder.Encode(report)
	if err != nil {
		return err
	}

	Log.Info().Msgf("Report generated: %s", filename)
	return nil
}

// BytesToHexString converts a byte slice to its hex string representation
func BytesToHexString(bytes []byte) string {
	// Convert the bytes to a hex string, preserving all bytes
	hexString := hex.EncodeToString(bytes)

	// Trim trailing zeros, but ensure at least one character remains
	trimmed := strings.TrimRight(hexString, "0")
	if trimmed == "" {
		trimmed = "0"
	}

	// Ensure the string represents at least one byte (two hex characters)
	if len(trimmed)%2 != 0 {
		trimmed = "0" + trimmed
	}

	// Add "0x" prefix
	return "0x" + trimmed
}
