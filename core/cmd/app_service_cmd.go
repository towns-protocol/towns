package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/rpc"
)

func runAppRegistryService(cmd *cobra.Command, args []string) error {
	err := setupProfiler("app-registry-node", cmdConfig)
	if err != nil {
		return err
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here
	return rpc.RunAppRegistryService(ctx, cmdConfig)
}

func init() {
	cmdRunAppRegistryService := &cobra.Command{
		Use:   "app-registry",
		Short: "Runs the app registry service",
		RunE:  runAppRegistryService,
	}

	rootCmd.AddCommand(cmdRunAppRegistryService)
}
