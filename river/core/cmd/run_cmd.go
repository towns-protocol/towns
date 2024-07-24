package cmd

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/spf13/cobra"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/rpc"
	"github.com/river-build/river/core/xchain/server"
)

func runServices(ctx context.Context, cfg *config.Config, stream bool, xchain bool) error {
	err := setupProfiler(ctx, cfg)
	if err != nil {
		return err
	}

	log := dlog.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var streamService *rpc.Service
	var metricsRegistry *prometheus.Registry
	if stream {
		streamService, err = rpc.StartServer(ctx, cfg, nil, nil)
		if err != nil {
			log.Error("Failed to start server", "error", err)
			return err
		}
		defer streamService.Close()
		metricsRegistry = streamService.MetricsRegistry()
	}

	// TODO: wire blockchain and tracer to xchain
	var xchainService server.XChain
	var wg sync.WaitGroup
	if xchain {
		xchainService, err = server.New(ctx, cmdConfig, nil, 1, metricsRegistry)
		if err != nil {
			return err
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			xchainService.Run(ctx)
		}()
	}

	osSignal := make(chan os.Signal, 1)
	signal.Notify(osSignal, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-osSignal
		if !cfg.Log.Simplify {
			log.Info("Got OS signal", "signal", sig.String())
		}
		if streamService != nil {
			streamService.ExitSignal() <- nil
		}
	}()

	if xchainService != nil {
		xchainService.Stop()
	}

	err = nil
	if streamService != nil {
		err = <-streamService.ExitSignal()
	}

	wg.Wait()

	return err
}

func init() {
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Runs the node with both stream or xchain services",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runServices(cmd.Context(), cmdConfig, true, true)
		},
	}

	cmd.AddCommand(&cobra.Command{
		Use:   "stream",
		Short: "Runs the node in stream mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runServices(cmd.Context(), cmdConfig, true, false)
		},
	})

	cmd.AddCommand(&cobra.Command{
		Use:   "xchain",
		Short: "Runs the node in xchain mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runServices(cmd.Context(), cmdConfig, false, true)
		},
	})

	rootCmd.AddCommand(cmd)
}
