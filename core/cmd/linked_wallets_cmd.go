package cmd

import (
	"context"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"
	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/xchain/entitlement"
)

func runGetLinkedWalletsCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	if !common.IsHexAddress(args[0]) {
		return fmt.Errorf("argument 0 is not an address: '%v'", args[0])
	}
	addr := common.HexToAddress(args[0])

	cfg := cmdConfig
	metrics := infra.NewMetricsFactory(nil, "river", "cmdline")
	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		metrics,
		nil,
	)
	if err != nil {
		return err
	}

	config, err := crypto.NewOnChainConfig(
		ctx,
		blockchain.Client,
		cfg.RegistryContract.Address,
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	evaluator, err := entitlement.NewEvaluatorFromConfig(
		ctx,
		cmdConfig,
		config,
		infra.NewMetricsFactory(nil, "", ""),
		nil,
	)
	if err != nil {
		return err
	}

	baseChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.BaseChain,
		nil,
		metrics,
		nil,
	)
	if err != nil {
		return err
	}

	walletLink, err := base.NewWalletLink(cfg.GetWalletLinkContractAddress(), baseChain.Client)
	if err != nil {
		return fmt.Errorf("could not instantiate wallet link contract: %w", err)
	}

	linkedWallets, err := evaluator.GetLinkedWallets(
		ctx,
		addr,
		walletLink,
		nil,
		nil,
		nil,
	)
	if err != nil {
		return fmt.Errorf("error computing linked wallets: %w", err)
	}

	fmt.Println("Linked Wallets")
	fmt.Println("==============")
	for _, wallet := range linkedWallets {
		fmt.Printf(" - %v\n", wallet)
	}

	return nil
}

func init() {
	cmdLinkedWallets := &cobra.Command{
		Use:   "linked-wallets <address>",
		Short: "Find all wallets linked to <address>, including delegator wallets",
		Long:  `Find all wallets linked to <address>, including wallets that delegated to any linked wallet on ethereum`,
		Args:  cobra.ExactArgs(1),
		RunE:  runGetLinkedWalletsCmd,
	}
	rootCmd.AddCommand(cmdLinkedWallets)
}
