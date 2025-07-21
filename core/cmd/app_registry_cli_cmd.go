package cmd

import (
	"context"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
)

func runCheckRegisteredApp(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	// Validate the input address
	if !common.IsHexAddress(args[0]) {
		return fmt.Errorf("argument is not a valid address: '%v'", args[0])
	}
	appAddress := common.HexToAddress(args[0])

	cfg := cmdConfig
	metrics := infra.NewMetricsFactory(nil, "base", "cmdline")

	// Create base chain
	baseChain, err := crypto.NewBlockchain(
		ctx,
		&cfg.BaseChain,
		nil,
		metrics,
		nil,
	)
	if err != nil {
		return fmt.Errorf("unable to create base chain: %w", err)
	}
	defer baseChain.Close()

	// Create app registry contract
	appRegistryContract, err := auth.NewAppRegistryContract(
		ctx,
		&cfg.AppRegistryContract,
		baseChain.Client,
	)
	if err != nil {
		return fmt.Errorf("unable to create app registry contract: %w", err)
	}

	// Check if the address is a registered app
	isRegistered, err := appRegistryContract.IsRegisteredApp(ctx, appAddress)
	if err != nil {
		return fmt.Errorf("unable to check if app is registered: %w", err)
	}

	fmt.Printf("App Registration Status for %s:\n", appAddress.Hex())
	fmt.Printf("Registered: %t\n", isRegistered)

	return nil
}

func init() {
	appCliCmd := &cobra.Command{
		Use:   "app-cli",
		Short: "App registry CLI commands",
	}
	rootCmd.AddCommand(appCliCmd)

	appCliCmd.AddCommand(&cobra.Command{
		Use:   "is-registered <app-address>",
		Short: "Check if an address is a registered app",
		Args:  cobra.ExactArgs(1),
		RunE:  runCheckRegisteredApp,
	})
}
