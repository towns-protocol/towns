package cmd

import (
	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/rpc"

	"github.com/spf13/cobra"
)

func runInfo(cmd *cobra.Command, cfg *config.Config) error {
	ctx := cmd.Context()
	return rpc.RunInfoMode(ctx, cfg)
}

func init() {
	cmd := &cobra.Command{
		Use:   "info",
		Short: "Runs the node in info mode when only /debug/multi page is available",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runInfo(cmd, cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
