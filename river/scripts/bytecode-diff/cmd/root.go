package cmd

import (
	"bytecode-diff/utils"
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

var (
	supportedEnvironments = []string{"alpha", "gamma", "omega"}
	baseRpcUrl            string
	facetSourcePath       string
	compiledFacetsPath    string
	sourceDiffDir         string
	sourceDiff            bool
	reportOutDir          string
	sourceEnvironment     string
	targetEnvironment     string
	deploymentsPath       string
	baseSepoliaRpcUrl     string
	logLevel              string
)

// Add this new constant declaration
var baseDiamonds = []utils.Diamond{
	utils.BaseRegistry,
	utils.Space,
	utils.SpaceFactory,
	utils.SpaceOwner,
}

func init() {
	log := zerolog.New(os.Stderr).With().Timestamp().Logger()
	utils.SetLogger(log)

	rootCmd.PersistentFlags().
		StringVar(&logLevel, "log-level", "info", "Set the logging level (debug, info, warn, error)")
	rootCmd.Flags().StringVarP(&baseRpcUrl, "base-rpc", "b", "", "Base RPC provider URL")
	rootCmd.Flags().StringVarP(&baseSepoliaRpcUrl, "base-sepolia-rpc", "", "", "Base Sepolia RPC provider URL")
	rootCmd.Flags().BoolVarP(&sourceDiff, "source-diff-only", "s", false, "Run source code diff")
	rootCmd.Flags().StringVar(&sourceDiffDir, "source-diff-log", "source-diffs", "Path to diff log file")
	rootCmd.Flags().StringVar(&compiledFacetsPath, "compiled-facets", "../../contracts/out", "Path to compiled facets")
	rootCmd.Flags().StringVar(&facetSourcePath, "facets", "", "Path to facet source files")
	rootCmd.Flags().BoolP("verbose", "v", false, "Enable verbose output")
	rootCmd.Flags().StringVar(&reportOutDir, "report-out-dir", "deployed-diffs", "Path to report output directory")
	rootCmd.Flags().
		StringVar(&deploymentsPath, "deployments", "../../contracts/deployments", "Path to deployments directory")

	rootCmd.AddCommand(AddHashesCmd)
}

func setLogLevel(level string) {
	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

func Execute() {
	if err := godotenv.Load(); err != nil {
		log.Warn().Msg("No .env file found")
	}

	if err := rootCmd.Execute(); err != nil {
		log.Error().Err(err).Msg("Error executing root command")
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "bytecode-diff [source_environment] [target_environment]",
	Short: "A tool to retrieve and display contract bytecode diff for Base",
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		setLogLevel(logLevel)
	},
	Args: func(cmd *cobra.Command, args []string) error {
		if sourceDiff {
			if len(args) != 0 {
				return fmt.Errorf("no positional arguments expected when --source-diff-only is set")
			}
		} else {
			if len(args) < 2 {
				return fmt.Errorf("at least two arguments required when --source-diff-only is not set, [source_environment], [target_environment]")
			}
		}
		return nil
	},
	PreRun: func(cmd *cobra.Command, args []string) {
		if sourceDiff {
			envSourceDiffDir := os.Getenv("SOURCE_DIFF_DIR")
			if envSourceDiffDir != "" {
				sourceDiffDir = envSourceDiffDir
			}

			if sourceDiffDir == "" {
				sourceDiffDir = cmd.Flag("source-diff-log").Value.String()
			}

			facetSourcePath = os.Getenv("FACET_SOURCE_PATH")
			if facetSourcePath == "" {
				facetSourcePath = cmd.Flag("facets").Value.String()
			}
			if facetSourcePath == "" {
				log.Fatal().
					Msg("Facet source path is missing. Set it using --facets flag or FACET_SOURCE_PATH environment variable")
			}

			compiledFacetsPath = os.Getenv("COMPILED_FACETS_PATH")
			log.Debug().Str("compiledFacetsPath", compiledFacetsPath).Msg("Compiled facets path from environment")
			if compiledFacetsPath == "" {
				compiledFacetsPath = cmd.Flag("compiled-facets").Value.String()
				log.Debug().Str("compiledFacetsPath", compiledFacetsPath).Msg("Compiled facets path from flag")
			}
			if compiledFacetsPath == "" {
				log.Fatal().
					Msg("Compiled facets path is missing. Set it using --compiled-facets flag or COMPILED_FACETS_PATH environment variable")
			}

			envReportOutDir := os.Getenv("REPORT_OUT_DIR")
			if envReportOutDir != "" {
				reportOutDir = envReportOutDir
			}
			if reportOutDir == "" {
				reportOutDir = cmd.Flag("report-out-dir").Value.String()
			}
			if reportOutDir == "" {
				log.Fatal().
					Msg("Report out directory is missing. Set it using --report-out-dir flag or REPORT_OUT_DIR environment variable")
			}
			envDeploymentsPath := os.Getenv("DEPLOYMENTS_PATH")
			if envDeploymentsPath != "" {
				deploymentsPath = envDeploymentsPath
			}
			if deploymentsPath == "" {
				deploymentsPath = cmd.Flag("deployments").Value.String()
			}
			if deploymentsPath == "" {
				log.Fatal().
					Msg("Deployments path is missing. Set it using --deployments flag or DEPLOYMENTS_PATH environment variable")
			}
			return
		}

	},
	Run: func(cmd *cobra.Command, args []string) {
		verbose, _ := cmd.Flags().GetBool("verbose")
		baseConfig := utils.BaseConfig{
			BaseRpcUrl:        baseRpcUrl,
			BaseSepoliaRpcUrl: baseSepoliaRpcUrl,
			BasescanAPIKey:    os.Getenv("BASESCAN_API_KEY"),
		}
		if sourceDiff {

			log.Info().
				Str("facetSourcePath", facetSourcePath).
				Str("compiledFacetsPath", compiledFacetsPath).
				Msg("Running diff for facet path recursively only compiled facet contracts")

			if err := executeSourceDiff(verbose, baseConfig, facetSourcePath, compiledFacetsPath, sourceDiffDir); err != nil {
				log.Fatal().Err(err).Msg("Error executing source diff")
				return
			}
		} else {

			sourceEnvironment, targetEnvironment = args[0], args[1]
			for _, environment := range []string{sourceEnvironment, targetEnvironment} {
				if !utils.Contains(supportedEnvironments, environment) {
					log.Fatal().Str("environment", environment).Msg("Environment not supported. Environment can be one of alpha, gamma, or omega.")
				}
			}

			log.Info().Str("sourceEnvironment", sourceEnvironment).Str("targetEnvironment", targetEnvironment).Msg("Environment")

			if baseRpcUrl == "" {
				baseRpcUrl = os.Getenv("BASE_RPC_URL")
				if baseRpcUrl == "" {
					log.Fatal().Msg("Base RPC URL not provided. Set it using --base-rpc flag or BASE_RPC_URL environment variable")
				}
			}

			if baseSepoliaRpcUrl == "" {
				baseSepoliaRpcUrl = os.Getenv("BASE_SEPOLIA_RPC_URL")
				if baseSepoliaRpcUrl == "" {
					log.Fatal().Msg("Base Sepolia RPC URL not provided. Set it using --base-sepolia-rpc flag or BASE_SEPOLIA_RPC_URL environment variable")
				}
			}

			basescanAPIKey := os.Getenv("BASESCAN_API_KEY")
			if basescanAPIKey == "" {
				log.Fatal().Msg("BaseScan API key not provided. Set it using BASESCAN_API_KEY environment variable")
			}

			log.Info().Str("sourceEnvironment", sourceEnvironment).Str("targetEnvironment", targetEnvironment).Msg("Running diff for environment")

			if err := executeEnvrionmentDiff(verbose, baseConfig, deploymentsPath, sourceEnvironment, targetEnvironment, reportOutDir); err != nil {
				log.Fatal().Err(err).Msg("Error executing environment diff")
			}
		}
	},
}

func executeSourceDiff(verbose bool, baseConfig utils.BaseConfig, facetSourcePath, compiledFacetsPath string, reportOutDir string) error {
	facetFiles, err := utils.GetFacetFiles(facetSourcePath)
	if err != nil {
		log.Error().
			Str("facetSourcePath", facetSourcePath).
			Str("compiledFacetsPath", compiledFacetsPath).
			Err(err).
			Msg("Error getting facet files")
		return err
	}
	log.Debug().Int("facetFilesCount", len(facetFiles)).Msg("Facet files length")

	compiledHashes, err := utils.GetCompiledFacetHashes(compiledFacetsPath, facetFiles)
	if err != nil {
		log.Error().
			Err(err).
			Str("compiledFacetsPath", compiledFacetsPath).
			Msg("Error getting compiled facet hashes")
		return err
	}

	if verbose {
		log.Info().Int("compiledHashesCount", len(compiledHashes)).Msg("Compiled Facet Hashes")
		for facet, hash := range compiledHashes {
			log.Info().Str("facet", string(facet)).Str("hash", hash).Msg("Compiled Facet Hash")
		}
	}
	// read all addresses of facets from alpha deployed diamond contracts
	const sourceEnvironment = "alpha"

	sourceDeploymentsPath := filepath.Join(deploymentsPath, sourceEnvironment)
	sourceDiamonds, err := utils.GetDiamondAddresses(sourceDeploymentsPath, baseDiamonds, verbose)

	// Create Ethereum client
	client, err := utils.CreateEthereumClient(baseConfig.BaseSepoliaRpcUrl)
	if err != nil {
		log.Error().Err(err).Msg("Error creating Ethereum client")
		return err
	}
	defer client.Close()

	alphaFacets := make(map[utils.DiamondName][]utils.Facet)
	for diamondName, diamondAddress := range sourceDiamonds {
		// read all facet addresses, names from diamond contract
		facets, err := utils.ReadAllFacets(client, diamondAddress, baseConfig.BasescanAPIKey, false)
		if err != nil {
			log.Error().Err(err).Str("diamond", string(diamondName)).Msg("Error reading all facets for source diamond")
			return err
		}
		alphaFacets[utils.DiamondName(diamondName)] = facets
	}

	err = utils.CreateFacetHashesReport(compiledFacetsPath, compiledHashes, alphaFacets, reportOutDir, sourceEnvironment, verbose)

	if err != nil {
		if verbose {
			log.Info().
				Str("compiledFacetsPath", compiledFacetsPath).
				Interface("compiledHashes", compiledHashes).
				Interface("alphaFacets", alphaFacets).
				Str("reportOutDir", reportOutDir).
				Bool("verbose", verbose).
				Msg("Arguments for CreateFacetHashesReport")
		}
		log.Error().Err(err).Msg("Error creating facet hashes report")
		return err
	}

	return nil
}

func executeEnvrionmentDiff(
	verbose bool,
	baseConfig utils.BaseConfig,
	deploymentsPath, sourceEnvironment, targetEnvironment string,
	reportOutDir string,
) error {
	// walk environment diamonds and get all facet addresses from DiamondLoupe facet view
	sourceDeploymentsPath := filepath.Join(deploymentsPath, sourceEnvironment)
	sourceDiamonds, err := utils.GetDiamondAddresses(sourceDeploymentsPath, baseDiamonds, verbose)
	if err != nil {
		log.Error().Err(err).Msgf("Error getting diamond addresses for source environment %s", sourceEnvironment)
		return err
	}
	targetDeploymentsPath := filepath.Join(deploymentsPath, targetEnvironment)
	targetDiamonds, err := utils.GetDiamondAddresses(targetDeploymentsPath, baseDiamonds, verbose)
	if err != nil {
		log.Error().Err(err).Msgf("Error getting diamond addresses for target environment %s", targetEnvironment)
		return err
	}
	// Create Ethereum client
	clients, err := utils.CreateEthereumClients(
		baseConfig.BaseRpcUrl,
		baseConfig.BaseSepoliaRpcUrl,
		sourceEnvironment,
		targetEnvironment,
		verbose,
	)
	defer func() {
		for _, client := range clients {
			client.Close()
		}
	}()
	// getCode for all facet addresses over base rpc url and compare with compiled hashes
	sourceFacets := make(map[string][]utils.Facet)

	for diamondName, diamondAddress := range sourceDiamonds {
		if verbose {
			log.Info().
				Str("diamondName", fmt.Sprintf("%s", diamondName)).
				Str("diamondAddress", diamondAddress).
				Msg("source Diamond Address")
		}
		facets, err := utils.ReadAllFacets(clients[sourceEnvironment], diamondAddress, baseConfig.BasescanAPIKey, true)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading all facets for source diamond %s", diamondName)
			return err
		}
		err = utils.AddContractCodeHashes(clients[sourceEnvironment], facets)
		if err != nil {
			log.Error().Err(err).Msgf("Error adding contract code hashes for source diamond %s", diamondName)
			return err
		}
		sourceFacets[string(diamondName)] = facets
	}

	targetFacets := make(map[string][]utils.Facet)
	for diamondName, diamondAddress := range targetDiamonds {
		facets, err := utils.ReadAllFacets(clients[targetEnvironment], diamondAddress, baseConfig.BasescanAPIKey, true)
		if err != nil {
			log.Error().Err(err).Msgf("Error reading all facets for target diamond %s", diamondName)
			return err
		}
		err = utils.AddContractCodeHashes(clients[targetEnvironment], facets)
		if err != nil {
			log.Error().Err(err).Msgf("Error adding contract code hashes for target diamond %s", diamondName)
			return err
		}
		targetFacets[string(diamondName)] = facets
	}
	if verbose {
		for diamondName, facets := range sourceFacets {
			log.Info().Str("diamondName", diamondName).Msg("source Facets for Diamond contract")
			for _, facet := range facets {
				log.Info().
					Str("facetAddress", facet.FacetAddress.Hex()).
					Str("contractName", facet.ContractName).
					Interface("selectors", facet.SelectorsHex).
					Msg("Facet")
			}
		}
		for diamondName, facets := range targetFacets {
			log.Info().Str("diamondName", diamondName).Msg("Target Facets for Diamond contract")
			for _, facet := range facets {
				log.Info().
					Str("facetAddress", facet.FacetAddress.Hex()).
					Str("contractName", facet.ContractName).
					Interface("selectors", facet.SelectorsHex).
					Msg("Facet")
			}
		}
	}

	// compare facets and create report
	differences := utils.CompareFacets(sourceFacets, targetFacets)
	if verbose {
		for diamondName, facets := range differences {
			log.Info().Str("diamondName", diamondName).Msg("Differences for Diamond contract")
			for _, facet := range facets {
				log.Info().
					Str("facetAddress", facet.SourceContractAddress.Hex()).
					Str("sourceContractName", facet.SourceContractName).
					Msg("Source Facet")
				log.Info().
					Interface("selectorDiff", facet.SelectorsDiff).
					Msg("Selector Diff")

			}
		}
	}

	// create report
	log.Info().Str("reportOutDir", reportOutDir).Msg("Generating YAML report")
	err = utils.GenerateYAMLReport(sourceEnvironment, targetEnvironment, differences, reportOutDir)
	if err != nil {
		log.Error().Err(err).Msg("Error generating YAML report")
		return err
	}
	return nil
}
