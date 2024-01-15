package cmd

import (
	"context"
	"os"
	"os/signal"
	"servers/xchain/config"
	"servers/xchain/server"
	"sync"
	"syscall"

	"github.com/river-build/river/dlog"
	"github.com/river-build/river/infra"

	"github.com/spf13/cobra"
)

func run() error {
	cfg := config.GetConfig()
	ctx := context.Background()

	pid := os.Getpid()

	log := dlog.CtxLog(ctx).With("pid", pid)

	ctx = dlog.CtxWithLog(ctx, log)

	if cfg.Metrics.Enabled {
		go infra.StartMetricsService(ctx, cfg.Metrics)
	}

	shutdown := make(chan struct{})
	var once sync.Once
	closeShutdown := func() {
		once.Do(func() {
			close(shutdown)
			log.Info("Channel shutdown closed")
		})
	}
	wgDone := make(chan struct{})
	// Start the worker goroutines
	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		wg.Wait()
		close(wgDone)
	}()

	go func() {
		defer wg.Done()
		server.RunServer(ctx, 1, shutdown)
	}()

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

out:

	for {
		select {
		case <-interrupt:
			log.Info("Interrupted")
			closeShutdown()
		case <-wgDone:
			log.Info("Done")
			break out
		}
	}
	return nil

}

func init() {
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Runs the node",
		RunE: func(cmd *cobra.Command, args []string) error {
			return run()
		},
	}

	rootCmd.AddCommand(cmd)
}
