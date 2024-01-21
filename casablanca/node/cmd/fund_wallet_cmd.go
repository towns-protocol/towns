package cmd

import (
	"context"

	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/testutils"

	"github.com/spf13/cobra"
)

func fund_wallet(cfg *config.Config) error {
	ctx := context.Background()
	log := dlog.CtxLog(ctx)

	wallet, err := crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
	if err != nil {
		return err
	}

	if !cfg.UseContract && !cfg.UseBlockChainStreamRegistry {
		log.Info("Not using blockchain, skipping funding")
		return nil
	}

	err = testutils.FundWallet(ctx, wallet.Address, cfg.RiverChain.NetworkUrl)
	if err != nil {
		return err
	}
	log.Info("Wallet funded for top-chain", "address", wallet.Address.String())
	return nil
}

func init() {
	cmd := &cobra.Command{
		Use:   "fund_wallet",
		Short: "fund the node wallet for testing in Anvil",
		RunE: func(cmd *cobra.Command, args []string) error {
			return fund_wallet(cmdConfig)
		},
	}

	rootCmd.AddCommand(cmd)
}
