package cmd

import (
	"casablanca/node/config"
	"casablanca/node/infra"
	"casablanca/node/rpc"
	"context"
	"fmt"
	"os"
	"runtime/pprof"
	"time"

	"github.com/spf13/cobra"
)

func run(cfg *config.Config) error {
	ctx := context.Background()
	if cfg.Metrics.Enabled {
		go infra.StartMetricsService(ctx, cfg.Metrics)
	}
	if cfg.PerformanceTracking.ProfilingEnabled {
		folderPath := "./profiles"

		// Check if the folder already exists
		if _, err := os.Stat(folderPath); os.IsNotExist(err) {
			err := os.Mkdir(folderPath, 0755) // 0755 sets permissions for the folder
			if err != nil {
				fmt.Println("Error creating profiling folder:", err)
				return err
			}
		}

		currentTime := time.Now()
		// Format the date and time as a string
		dateTimeFormat := "20060102150405" // YYYYMMDDHHMMSS
		formattedDateTime := currentTime.Format(dateTimeFormat)

		// Create a file with the formatted date and time in the name
		filename := fmt.Sprintf("profile_%s.prof", formattedDateTime)
		file, err := os.Create("profiles/" + filename)
		if err != nil {
			fmt.Println("Error creating file", err)
			return err
		}
		err = pprof.StartCPUProfile(file)
		if err != nil {
			fmt.Println("Error starting profiling", err)
			return err
		}
		defer pprof.StopCPUProfile()
	}
	return rpc.RunServer(ctx, cfg)
}

func init() {
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Runs the node",
		RunE: func(cmd *cobra.Command, args []string) error {
			return run(cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
