package cmd

import (
	"context"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/rpc"

	"github.com/spf13/cobra"
)

func runInfo(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	return rpc.RunInfoMode(ctx, cfg)
}

func init() {
	cmd := &cobra.Command{
		Use:   "info",
		Short: "Runs the node in info mode when only /debug/multi page is available",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runInfo(cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
