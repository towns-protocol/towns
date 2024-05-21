package cmd

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/river-build/river/core/xchain/server"

	"github.com/spf13/cobra"
)

func run() error {
	// cfg := config.GetConfig()
	// if cfg.Metrics.Enabled {
	// 	// Since the xchain server runs alongside the stream node
	// 	// we don't need to start the metrics service here
	// 	go infra.StartMetricsService(ctx, cfg.Metrics)
	// }

	var (
		ctx   = context.Background()
		tasks sync.WaitGroup
	)

	// create xchain instance
	srv, err := server.New(ctx, loadedCfg, nil, 1)
	if err != nil {
		return err
	}

	// run server in background
	tasks.Add(1)
	go func() {
		srv.Run(ctx)
		tasks.Done()
	}()

	// wait for signal to shut down
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
	<-interrupt

	// order background task to stop
	srv.Stop()

	// wait for background tasks to finish
	tasks.Wait()

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
