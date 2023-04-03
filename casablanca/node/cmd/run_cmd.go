package cmd

import (
	"casablanca/node/config"
	"casablanca/node/infra"
	"casablanca/node/rpc"

	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

func run(cfg *config.Config) {
	if cfg.Metrics.Enabled {
		go infra.StartMetricsService(cfg.Metrics)
	}

	rpc.RunServer(cfg)
	log.Print("Goodbye")
}

func init() {
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Runs the node",
		Run: func(cmd *cobra.Command, args []string) {
			run(cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
