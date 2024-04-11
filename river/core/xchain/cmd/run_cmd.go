package cmd

import (
	"context"
	"core/xchain/server"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/river-build/river/core/node/dlog"

	"github.com/spf13/cobra"
)

func run() error {
	ctx, cancel := context.WithCancel(context.Background())

	pid := os.Getpid()

	log := dlog.FromCtx(ctx).With("pid", pid)

	ctx = dlog.CtxWithLog(ctx, log)

	// cfg := config.GetConfig()
	// if cfg.Metrics.Enabled {
	// 	// Since the xchain server runs alongside the stream node
	// 	// we don't need to start the metrics service here
	// 	go infra.StartMetricsService(ctx, cfg.Metrics)
	// }

	shutdown := make(chan struct{})
	var once sync.Once
	closeShutdown := func() {
		once.Do(func() {
			close(shutdown)
			cancel()
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
			log.Info("Run Interrupted")
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
