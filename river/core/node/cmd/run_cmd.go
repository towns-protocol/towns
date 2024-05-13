package cmd

import (
	"context"
	"fmt"
	"os"
	"runtime/pprof"
	"time"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/node/version"
	"github.com/river-build/river/core/node/rpc"

	"github.com/spf13/cobra"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gopkg.in/DataDog/dd-trace-go.v1/profiler"
)

func runMetricsAndProfiler(ctx context.Context, cfg *config.Config) error {
	if cfg.Metrics.Enabled {
		go infra.StartMetricsService(ctx, cfg.Metrics)
	}
	if cfg.PerformanceTracking.TracingEnabled {
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

			err := profiler.Start(
				// profiler.WithService("<SERVICE_NAME>"),
				// ^ falling back to DD_SERVICE env var
				// profiler.WithEnv("<ENVIRONMENT>"),
				// ^ falling back to DD_ENV env var
				profiler.WithVersion(version.GetFullVersion()),
				profiler.WithTags(getDDTags()),
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

			if _, err := os.Stat(folderPath); os.IsNotExist(err) {
				err := os.Mkdir(folderPath, 0o755)
				if err != nil {
					fmt.Println("Error creating profiling folder:", err)
					return err
				}
			}

			currentTime := time.Now()

			dateTimeFormat := "20060102150405"
			formattedDateTime := currentTime.Format(dateTimeFormat)

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
	return nil
}

func runServer(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	err := runMetricsAndProfiler(ctx, cfg)
	if err != nil {
		return err
	}
	return rpc.RunServer(ctx, cfg)
}

func getDDTags() string {
	ddTags := os.Getenv("DD_TAGS")
	if ddTags != "" {
		ddTags += ","
	}
	ddTags += "commit:" + version.GetCommit() + ",version_slim:" + version.GetVersion() + ",branch:" + version.GetBranch()
	return ddTags
}

func init() {
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Runs the node",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runServer(cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
