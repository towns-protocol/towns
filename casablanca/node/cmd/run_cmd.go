package cmd

import (
	"context"
	"fmt"
	"os"
	"runtime/pprof"
	"time"

	"github.com/river-build/river/config"
	"github.com/river-build/river/infra"
	"github.com/river-build/river/rpc"

	"github.com/spf13/cobra"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gopkg.in/DataDog/dd-trace-go.v1/profiler"
)

func run(cfg *config.Config) error {
	ctx := context.Background()
	if cfg.Metrics.Enabled {
		go infra.StartMetricsService(ctx, cfg.Metrics)
	}
	if cfg.PerformanceTracking.ProfilingEnabled {
		if os.Getenv("DD_ENV") != "" {
			fmt.Println("Starting Datadog tracer")
			tracer.Start()
			defer tracer.Stop()
		} else {
			fmt.Println("Tracing was enabled, but DD_ENV was not set. Tracing will not be enabled.")
		}
	} else {
		fmt.Println("Tracing disabled")
	}
	if cfg.PerformanceTracking.ProfilingEnabled {
		if os.Getenv("DD_ENV") != "" {
			fmt.Println("Starting Datadog profiler")
			// if the DD_ENV environment variable is set, we assume that the Datadog agent is running,
			// and start the Datadog profiler instead of pprof
			err := profiler.Start(
				// profiler.WithService("<SERVICE_NAME>"),
				// ^ falling back to DD_SERVICE env var
				// profiler.WithEnv("<ENVIRONMENT>"),
				// ^ falling back to DD_ENV env var
				profiler.WithVersion(os.Getenv("RELEASE_VERSION")),
				// profiler.WithTags("<KEY1>:<VALUE1>", "<KEY2>:<VALUE2>"),
				// ^ falling back to DD_TAGS env var
				profiler.WithProfileTypes(
					profiler.CPUProfile,
					profiler.HeapProfile,
					profiler.BlockProfile,
					profiler.MutexProfile,
					profiler.GoroutineProfile,
				),
			)
			if err != nil {
				fmt.Println("Error starting profiling", err)
				return err
			}
			defer profiler.Stop()
		} else {
			fmt.Println("Starting pprof profiler")
			folderPath := "./profiles"

			// Check if the folder already exists
			if _, err := os.Stat(folderPath); os.IsNotExist(err) {
				err := os.Mkdir(folderPath, 0o755) // 0755 sets permissions for the folder
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
	} else {
		fmt.Println("Profiling disabled")
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
