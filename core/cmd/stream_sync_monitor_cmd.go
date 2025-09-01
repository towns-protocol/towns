package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/rpc"
)

func runStreamSyncMonitor(cmd *cobra.Command, args []string) error {
	err := setupProfiler("sync_monitor", cmdConfig)
	if err != nil {
		return err
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here
	return rpc.RunStreamSyncMonitor(ctx, cmdConfig)
}

func init() {
	cmdRunStreamSyncMonitor := &cobra.Command{
		Use:   "sync-monitor",
		Short: "Runs the stream sync monitor service to detect lagging streams on monitored nodes",
		RunE:  runStreamSyncMonitor,
	}

	rootCmd.AddCommand(cmdRunStreamSyncMonitor)
}
