package cmd

import (
	"fmt"
	"os"
	"slices"
	"strings"

	"github.com/mitchellh/mapstructure"

	"github.com/river-build/river/core/config"

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

func bindViperKeys(
	vpr *viper.Viper,
	varPrefix string,
	envPrefixSingle string,
	envPrefixDouble string,
	m map[string]interface{},
	canonicalEnvVar *[]string,
) error {
	for k, v := range m {
		subMap, ok := v.(map[string]interface{})
		if ok {
			upperK := strings.ToUpper(k)
			err := bindViperKeys(
				vpr,
				varPrefix+k+".",
				envPrefixSingle+upperK+"_",
				envPrefixDouble+upperK+"__",
				subMap,
				canonicalEnvVar,
			)
			if err != nil {
				return err
			}
		} else {
			envName := strings.ToUpper(k)
			canonical := "RIVER_" + envPrefixSingle + envName
			*canonicalEnvVar = append(*canonicalEnvVar, canonical)
			err := vpr.BindEnv(varPrefix+k, canonical, envPrefixDouble+envName)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func initViperConfig() (*config.Config, *viper.Viper, []string, error) {
	vpr := viper.New()

	if configFile != "" {
		vpr.SetConfigFile(configFile)
	} else {
		fmt.Println("No config file specified")
	}

	// This iterates over all possible keys in config.Config and binds evn vars to them
	// For each key, there are two bound env vars:
	// Mertics.Enabled <= RIVER_METRICS_ENABLED, METRICS__ENABLED
	// With RIVER_METRICS_ENABLED being canonical and recommended.
	// The double underscore version is for compatibility with older versions of the settings.
	configMap := make(map[string]interface{})
	err := mapstructure.Decode(config.Config{}, &configMap)
	if err != nil {
		return nil, nil, nil, err
	}
	canonicalConfigEnvVars := make([]string, 0, 50)
	err = bindViperKeys(vpr, "", "", "", configMap, &canonicalConfigEnvVars)
	if err != nil {
		return nil, nil, nil, err
	}
	slices.Sort(canonicalConfigEnvVars)

	err = vpr.ReadInConfig()
	if err != nil {
		return nil, nil, nil, err
	}

	var configStruct config.Config
	err = vpr.Unmarshal(
		&configStruct,
		viper.DecodeHook(
			mapstructure.ComposeDecodeHookFunc(
				config.DecodeAddressOrAddressFileHook(),
				config.DecodeDurationHook(),
				config.DecodeUint64SliceHook(),
			),
		),
	)
	if err != nil {
		return nil, nil, nil, err
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

	err = configStruct.Init()
	if err != nil {
		return nil, nil, nil, err
	}

	return &configStruct, vpr, canonicalConfigEnvVars, nil
}

func initConfigAndLog() {
	var err error
	cmdConfig, _, _, err = initViperConfig()
	if err != nil {
		fmt.Println("Failed to initialize config, error=", err)
		os.Exit(1)
	}
	InitLogFromConfig(&cmdConfig.Log)
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
