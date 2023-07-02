package cmd

import (
	"casablanca/node/config"
	"casablanca/node/infra"
	"casablanca/node/rpc"
	"context"

	"github.com/spf13/cobra"
)

func run(cfg *config.Config) error {
	ctx := context.Background()
	if cfg.Metrics.Enabled {
		go infra.StartMetricsService(ctx, cfg.Metrics)
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
