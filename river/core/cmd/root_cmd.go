package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/config/builder"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var configFiles []string

var (
	logLevel     string
	logFile      string
	logToConsole bool
	logNoColor   bool
)

var (
	cmdConfig        *config.Config
	cmdConfigBuilder *builder.ConfigBuilder[config.Config]
)

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

func initViperConfig() (*config.Config, *builder.ConfigBuilder[config.Config], error) {
	cfg := config.GetDefaultConfig()

	bld, err := builder.NewConfigBuilder(cfg, "RIVER")
	if err != nil {
		return nil, nil, err
	}

	bld.BindPFlag("Log.Level", rootCmd.PersistentFlags().Lookup("log_level"))
	bld.BindPFlag("Log.File", rootCmd.PersistentFlags().Lookup("log_file"))
	bld.BindPFlag("Log.Console", rootCmd.PersistentFlags().Lookup("log_to_console"))
	bld.BindPFlag("Log.NoColor", rootCmd.PersistentFlags().Lookup("log_no_color"))

	for _, configFile := range configFiles {
		err = bld.LoadConfig(configFile)
		if err != nil {
			return nil, nil, err
		}
	}

	cfg, err = bld.Build()
	if err != nil {
		return nil, nil, err
	}

	err = cfg.Init()
	if err != nil {
		return nil, nil, err
	}

	return cfg, bld, nil
}

func initConfigAndLog() {
	var err error
	cmdConfig, cmdConfigBuilder, err = initViperConfig()
	if err != nil {
		fmt.Println("Failed to initialize config, error=", err)
		os.Exit(1)
	}
	InitLogFromConfig(&cmdConfig.Log)
}

func init() {
	cobra.OnInitialize(initConfigAndLog)

	rootCmd.PersistentFlags().
		StringSliceVarP(&configFiles, "config", "c", []string{"./config/config.yaml"},
			"Path to the configuration file. Can be specified multiple times. Values are applied in sequence. Set to empty to disable default config.")

	rootCmd.PersistentFlags().StringP(
		"log_level",
		"l",
		"info",
		"Log level (options: trace, debug, info, warn, error, panic, fatal)",
	)
	rootCmd.PersistentFlags().String(
		"log_file",
		"",
		"Path to the log file",
	)
	rootCmd.PersistentFlags().Bool(
		"log_to_console",
		false,
		"Log to console",
	)
	rootCmd.PersistentFlags().Bool(
		"log_no_color",
		false,
		"Disable color in log output",
	)
}
