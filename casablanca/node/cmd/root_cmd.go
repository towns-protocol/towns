package cmd

import (
	"casablanca/node/config"
	"casablanca/node/infra"
	"io"
	"strings"

	"fmt"
	"os"

	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var configFile string
var logLevelOverride string
var logFileOverride string
var eventsFileOverride string
var cmdConfig *config.Config

var rootCmd = &cobra.Command{
	Use:   "node",
	Short: "Towns.com node",
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
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

		var configStruct config.Config
		if err := viper.Unmarshal(&configStruct); err != nil {
			fmt.Printf("Failed to unmarshal config, error=%v\n", err)
		}

		if logLevelOverride != "" {
			configStruct.Log.Level = logLevelOverride
		}
		if logFileOverride != "default" {
			if logFileOverride != "none" {
				configStruct.Log.File = logFileOverride
			} else {
				configStruct.Log.File = ""
			}
		}
		if eventsFileOverride != "none" {
			configStruct.Log.Events = eventsFileOverride
		}
		// If loaded successfully, set the global config
		cmdConfig = &configStruct

		log.StandardLogger().SetNoLock()
		log.StandardLogger().SetFormatter(&log.TextFormatter{
			FullTimestamp: true,
		})

		if level, err := log.ParseLevel(cmdConfig.Log.Level); err != nil {
			log.Warnf("failed to parse log level %v: %v", cmdConfig.Log.Level, err)
		} else {
			log.SetLevel(level)
			infra.EventsLogger.SetLevel(level)
		}

		log.Infof("Log file set to %v", cmdConfig.Log.File)
		if cmdConfig.Log.Events != "" && log.GetLevel() >= log.DebugLevel {
			log.Infof("Event log file set to %v", cmdConfig.Log.Events)
		}
		// TODO: use hook instead of multiwriter
		if cmdConfig.Log.File != "" {
			f, err := os.OpenFile(cmdConfig.Log.File, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
			if err != nil {
				log.Warnf("failed to open log file: %v", err)
			}
			cobra.OnFinalize(func() { f.Close() })
			wrt := io.MultiWriter(os.Stdout, f)
			log.SetOutput(wrt)
		}
		if cmdConfig.Log.Events != "" && log.GetLevel() >= log.DebugLevel {
			f, err := os.OpenFile(cmdConfig.Log.Events, os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0644)
			if err != nil {
				log.Warnf("failed to open event log file: %v", err)
			}
			cobra.OnFinalize(func() { f.Close() })
			wrt := io.MultiWriter(os.Stdout, f)
			infra.EventsLogger.SetOutput(wrt)
		}
	} else {
		fmt.Println("No config file specified")
	}
}

func init() {
	cobra.OnInitialize(initConfigAndLog)
	rootCmd.PersistentFlags().StringVarP(&configFile, "config", "c", "dev.yaml", "Path to the configuration file")
	rootCmd.PersistentFlags().StringVarP(&logLevelOverride, "log_level", "l", "", "Override log level (options: trace, debug, info, warn, error, panic, fatal)")
	rootCmd.PersistentFlags().StringVar(&logFileOverride, "log_file", "default", "Override log file ('default' to use the one specified in the config file, 'none' to disable logging to file)")
	rootCmd.PersistentFlags().StringVar(&eventsFileOverride, "events_file", "none", "Override log event file for debug mode ('none' to disable logging to file, it is default setting)")

}
