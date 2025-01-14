package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/river-build/river/core/node/rpc"
)

func runNotificationService(cmd *cobra.Command, args []string) error {
	err := setupProfiler("notification-node", cmdConfig)
	if err != nil {
		return err
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here
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
