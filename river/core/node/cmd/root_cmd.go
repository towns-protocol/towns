package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/mitchellh/mapstructure"

	"github.com/river-build/river/core/node/config"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var configFile string

var (
	logLevel     string
	logFile      string
	logToConsole bool
	logNoColor   bool
)

var cmdConfig *config.Config

var rootCmd = &cobra.Command{
	Use:          "river_node",
	Short:        "River Protocol Node",
	SilenceUsage: true, // Do not print usage when an error occurs
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		if err.Error() == "info_debug_exit" {
			fmt.Println("Exiting with code 22 to initiate a restart")
			os.Exit(22)
			return
		}
		os.Exit(1)
	}
}

func initConfigAndLog() {
	if configFile != "" {
		viper.SetConfigFile(configFile)

		// This is needed to allow for nested config values to be set via environment variables
		// For example: METRICS__ENABLED=true, METRICS__PORT=8080
		viper.SetEnvKeyReplacer(strings.NewReplacer(".", "__"))
		viper.AutomaticEnv()

		if err := viper.ReadInConfig(); err != nil {
			fmt.Printf("Failed to read config file, file=%v, error=%v\n", configFile, err)
		}

		var (
			configStruct config.Config
			decodeHooks  = mapstructure.ComposeDecodeHookFunc(
				config.DecodeAddressOrAddressFileHook(),
				config.DecodeDurationHook(),
			)
		)

		if err := viper.Unmarshal(&configStruct, viper.DecodeHook(decodeHooks)); err != nil {
			fmt.Printf("Failed to unmarshal config, error=%v\n", err)
		}

		if configStruct.Log.Format == "" {
			configStruct.Log.Format = "text"
		}

		if logLevel != "" {
			configStruct.Log.Level = logLevel
		}
		if logFile != "default" {
			if logFile != "none" {
				configStruct.Log.File = logFile
			} else {
				configStruct.Log.File = ""
			}
		}
		if logToConsole {
			configStruct.Log.Console = true
		}
		if logNoColor {
			configStruct.Log.NoColor = true
		}
		configStruct.Init()

		// If loaded successfully, set the global config
		cmdConfig = &configStruct
		InitLogFromConfig(&cmdConfig.Log)
	} else {
		fmt.Println("No config file specified")
	}
}

func init() {
	cobra.OnInitialize(initConfigAndLog)
	rootCmd.PersistentFlags().
		StringVarP(&configFile, "config", "c", "./config/config.yaml", "Path to the configuration file")

	rootCmd.PersistentFlags().StringVarP(
		&logLevel,
		"log_level",
		"l",
		"",
		"Override log level (options: trace, debug, info, warn, error, panic, fatal)",
	)
	rootCmd.PersistentFlags().StringVar(
		&logFile,
		"log_file",
		"default",
		"Override log file ('default' to use the one specified in the config file, 'none' to disable logging to file)",
	)
	rootCmd.PersistentFlags().BoolVar(
		&logToConsole,
		"log_to_console",
		false,
		"Override log to console (true to log to console, false to use the one specified in the config file)",
	)
	rootCmd.PersistentFlags().BoolVar(
		&logNoColor,
		"log_no_color",
		false,
		"Override log color (true to disable color, false to use the one specified in the config file)",
	)
}
