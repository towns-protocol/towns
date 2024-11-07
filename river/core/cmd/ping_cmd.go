package cmd

import (
	"context"
	"fmt"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/rpc"

	"github.com/spf13/cobra"
)

func runPing(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	riverChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	baseChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.BaseChain,
		nil,
		infra.NewMetricsFactory(nil, "base", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		riverChain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}

	nodeRegistry, err := nodes.LoadNodeRegistry(
		ctx, registryContract, common.Address{}, riverChain.InitialBlockNum, riverChain.ChainMonitor, nil)
	if err != nil {
		return err
	}

	result, err := rpc.GetRiverNetworkStatus(ctx, cfg, nodeRegistry, riverChain, baseChain, nil, nil)
	if err != nil {
		return err
	}

	fmt.Println(result.ToPrettyJson())
	return nil
}

func init() {
	cmd := &cobra.Command{
		Use:   "ping",
		Short: "Pings all nodes in the network based on config and print the results as JSON",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runPing(cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
