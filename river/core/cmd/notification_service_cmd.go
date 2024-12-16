package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/river-build/river/core/node/rpc"
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
