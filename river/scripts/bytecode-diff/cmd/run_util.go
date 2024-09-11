package cmd

import (
	"bytecode-diff/utils"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

var htmlRender bool

func getIncrementedFileName(basePath string, extension string) string {
	dir := filepath.Dir(basePath)
	fileName := filepath.Base(basePath[:len(basePath)-len(filepath.Ext(basePath))])

	for i := 1; ; i++ {
		newFileName := fmt.Sprintf("%s_hashed_%d%s", fileName, i, extension)
		fullPath := filepath.Join(dir, newFileName)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			return fullPath
		}
	}
}

var AddHashesCmd = &cobra.Command{
	Use:   "add-hashes [environment] [yaml_file_path]",
	Short: "Add bytecode hashes and render yaml, html reports",
	Args:  cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		environment := args[0]
		yamlFilePath := args[1]

		supportedEnvironments := []string{"alpha", "gamma", "omega"}
		if !utils.Contains(supportedEnvironments, environment) {
			log.Fatal().
				Str("environment", environment).
				Msg("Environment not supported. Environment can be one of alpha, gamma, or omega.")
		}

		// todo: just require 1 rpc url based on env
		if baseRpcUrl == "" {
			log.Fatal().
				Msg("Base RPC URL not provided. Set it using --base-rpc-url flag or BASE_RPC_URL environment variable")
		}

		if baseSepoliaRpcUrl == "" {
			log.Fatal().
				Msg("Base Sepolia RPC URL not provided. Set it using --base-sepolia-rpc-url flag or BASE_SEPOLIA_RPC_URL environment variable")
		}

		// Create Ethereum client
		clients, err := utils.CreateEthereumClients(
			baseRpcUrl,
			baseSepoliaRpcUrl,
			environment,
			"",
			false,
		)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to create Ethereum client")
		}
		defer clients[environment].Close()

		// Read YAML file
		yamlData, err := os.ReadFile(yamlFilePath)
		if err != nil {
			log.Fatal().Err(err).Str("file", yamlFilePath).Msg("Failed to read YAML file")
		}

		var data map[string]interface{}
		err = yaml.Unmarshal(yamlData, &data)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to unmarshal YAML data")
		}

		// Process deployments
		deployments, ok := data["deployments"].(map[string]interface{})
		if !ok {
			log.Fatal().Msg("Invalid YAML structure: 'deployments' field not found or not a map")
		}

		for name, deployment := range deployments {
			deploymentMap, ok := deployment.(map[string]interface{})
			if !ok {
				log.Warn().Str("name", name).Msg("Skipping invalid deployment entry")
				continue
			}

			address, ok := deploymentMap["address"].(string)
			if !ok {
				log.Warn().Str("name", name).Msg("Skipping deployment without valid address")
				continue
			}

			addressBytes := common.HexToAddress(address)
			hash, err := utils.GetContractCodeHash(clients[environment], addressBytes)
			if err != nil {
				log.Error().Err(err).Str("name", name).Str("address", address).Msg("Failed to get contract code hash")
				continue
			}

			deploymentMap["bytecodeHash"] = hash
		}

		// Write updated YAML file
		outputPath := getIncrementedFileName(yamlFilePath, ".yaml")

		updatedYAML, err := yaml.Marshal(data)
		if err != nil {
			log.Fatal().Err(err).Msg("Failed to marshal updated YAML data")
		}

		err = os.WriteFile(outputPath, updatedYAML, 0644)
		if err != nil {
			log.Fatal().Err(err).Str("file", outputPath).Msg("Failed to write updated YAML file")
		}

		// After writing the updated YAML file
		if htmlRender {
			htmlContent, err := renderYAMLToHTML(updatedYAML, environment)
			if err != nil {
				log.Error().Err(err).Msg("Failed to render YAML to HTML")
			} else {
				htmlOutputPath := getIncrementedFileName(yamlFilePath, ".html")
				err = os.WriteFile(htmlOutputPath, []byte(htmlContent), 0644)
				if err != nil {
					log.Error().Err(err).Str("file", htmlOutputPath).Msg("Failed to write HTML file")
				} else {
					log.Info().Str("file", htmlOutputPath).Msg("Successfully wrote HTML file with bytecode hashes")
				}
			}
		}

		log.Info().Str("file", outputPath).Msg("Successfully wrote updated YAML file with bytecode hashes")
	},
}

func renderYAMLToHTML(yamlData []byte, environment string) (string, error) {
	var data map[string]interface{}
	err := yaml.Unmarshal(yamlData, &data)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal YAML data: %w", err)
	}

	data["environment"] = environment
	data["reportTime"] = time.Now().UTC().Format(time.RFC3339)

	t, err := template.ParseFiles("templates/report.html")
	if err != nil {
		return "", fmt.Errorf("failed to parse HTML template: %w", err)
	}

	var buf strings.Builder
	err = t.Execute(&buf, data)
	if err != nil {
		return "", fmt.Errorf("failed to execute HTML template: %w", err)
	}

	return buf.String(), nil
}

func init() {
	AddHashesCmd.Flags().StringVar(&baseRpcUrl, "base-rpc-url", os.Getenv("BASE_RPC_URL"), "Base RPC URL")
	AddHashesCmd.Flags().
		StringVar(&baseSepoliaRpcUrl, "base-sepolia-rpc-url", os.Getenv("BASE_SEPOLIA_RPC_URL"), "Base Sepolia RPC URL")
	AddHashesCmd.Flags().BoolVar(&htmlRender, "html-render", true, "Render output as HTML")
}
