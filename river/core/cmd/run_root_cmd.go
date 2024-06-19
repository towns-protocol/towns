package cmd

import "github.com/spf13/cobra"

func init() {
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Runs the node in either stream or xchain mode",
	}

	cmd.AddCommand(&cobra.Command{
		Use:   "stream",
		Short: "Runs the node in stream mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runStreamMode(cmdConfig)
		},
	})

	cmd.AddCommand(&cobra.Command{
		Use:   "xchain",
		Short: "Runs the node in xchain mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runXChain()
		},
	})

	rootCmd.AddCommand(cmd)
}
