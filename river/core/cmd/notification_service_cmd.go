package cmd

import (
	"context"

	"github.com/river-build/river/core/node/rpc"
	"github.com/spf13/cobra"
)

func runNotificationService(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	err := setupProfiler(ctx, "notification-node", cmdConfig)
	if err != nil {
		return err
	}

	return rpc.RunNotificationService(ctx, cmdConfig)
}

func init() {
	cmdRunNotificationService := &cobra.Command{
		Use:   "notifications",
		Short: "Runs the notification service",
		RunE:  runNotificationService,
	}

	rootCmd.AddCommand(cmdRunNotificationService)
}
