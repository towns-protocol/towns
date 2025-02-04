package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/river-build/river/core/node/rpc"
)

func runBotRegistryService(cmd *cobra.Command, args []string) error {
	err := setupProfiler("bot-registry-node", cmdConfig)
	if err != nil {
		return err
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here
	return rpc.RunBotRegistryService(ctx, cmdConfig)
}

func init() {
	cmdRunBotRegistryService := &cobra.Command{
		Use:   "bot-registry",
		Short: "Runs the bot registry service",
		RunE:  runBotRegistryService,
	}

	rootCmd.AddCommand(cmdRunBotRegistryService)
}
