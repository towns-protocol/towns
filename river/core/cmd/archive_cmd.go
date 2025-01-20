package cmd

import (
	"context"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/rpc"
	"go.uber.org/zap"

	"github.com/spf13/cobra"
)

func runArchive(cfg *config.Config, once bool) error {
	err := setupProfiler("archive-node", cfg)

	// Enable sampling for archiver logs.
	zap.ReplaceGlobals(logging.SampledLogger(zap.L()))

	if err != nil {
		return err
	}
	ctx := context.Background() // lint:ignore context.Background() is fine here
	return rpc.RunArchive(ctx, cfg, once)
}

func init() {
	cmdArch := &cobra.Command{
		Use:   "archive",
		Short: "Runs the node in archive mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			once, err := cmd.Flags().GetBool("once")
			if err != nil {
				return err
			}
			return runArchive(cmdConfig, once)
		},
	}

	cmdArch.Flags().Bool("once", false, "Run the archiver once and exit")

	rootCmd.AddCommand(cmdArch)
}
