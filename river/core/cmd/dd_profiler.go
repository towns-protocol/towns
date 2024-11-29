package cmd

import (
	"context"
	"fmt"
	"os"
	"runtime/pprof"
	"strings"
	"time"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/river_node/version"
	"gopkg.in/DataDog/dd-trace-go.v1/profiler"
)

func setupProfiler(ctx context.Context, serviceName string, cfg *config.Config) error {
	// we overwrite the DD_TAGS environment variable, because this is the best way to pass them down to the tracer
	setDDTagsEnv()

	if cfg.PerformanceTracking.ProfilingEnabled {
		if os.Getenv("DD_TAGS") != "" {
			fmt.Println("Starting Datadog profiler")

			err := profiler.Start(
				profiler.WithEnv(getEnvFromDDTags()),
				profiler.WithService(serviceName),
				profiler.WithVersion(version.GetFullVersion()),
				profiler.WithProfileTypes(
					profiler.CPUProfile,
					profiler.HeapProfile,
					profiler.BlockProfile,
					profiler.MutexProfile,
					profiler.GoroutineProfile,
				),
				// profiler.WithTags(setDDTags()),
				// ^ falling back to DD_TAGS env var
			)
			if err != nil {
				fmt.Println("Error starting profiling", err)
				return err
			}
			// defer profiler.Stop()
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
			// defer pprof.StopCPUProfile()
		}
	} else {
		fmt.Println("Profiling disabled")
	}
	return nil
}

// overwrites the DD_TAGS environment variable to include the commit, version and branch
func setDDTagsEnv() {
	ddTags := os.Getenv("DD_TAGS")
	if ddTags != "" {
		ddTags += ","
	}
	ddTags += "commit:" + version.GetCommit() + ",version_slim:" + version.GetVersion() + ",branch:" + version.GetBranch()
	os.Setenv("DD_TAGS", ddTags)
}

func getEnvFromDDTags() string {
	ddTags := os.Getenv("DD_TAGS")
	if ddTags == "" {
		return ""
	}
	tags := strings.Split(ddTags, ",")
	for _, tag := range tags {
		if strings.HasPrefix(tag, "env:") {
			return strings.TrimPrefix(tag, "env:")
		}
	}
	return ""
}
