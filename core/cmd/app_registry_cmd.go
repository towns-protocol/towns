package cmd

import (
	"context"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/rpc"

	"github.com/spf13/cobra"
)

func runAppRegistry(ctx context.Context, cfg *config.Config) error {
	err := setupProfiler("app-registry-node", cfg)
	if err != nil {
		return err
	}
	return rpc.RunAppRegistryService(ctx, cfg)
}

func init() {
	cmdAppRegistry := &cobra.Command{
		Use:   "app-registry",
		Short: "Runs the node in app registry mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runAppRegistry(cmd.Context(), cmdConfig)
		},
	}

	rootCmd.AddCommand(cmdAppRegistry)
}
