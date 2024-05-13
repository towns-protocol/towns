package cmd

import (
	"context"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/rpc"

	"github.com/spf13/cobra"
)

func runArchive(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	err := runMetricsAndProfiler(ctx, cfg)
	if err != nil {
		return err
	}
	return rpc.RunArchive(ctx, cfg)
}

func init() {
	cmd := &cobra.Command{
		Use:   "archive",
		Short: "Runs the node in archive mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runArchive(cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
