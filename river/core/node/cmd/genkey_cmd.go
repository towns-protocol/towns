package cmd

import (
	"context"
	"os"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"

	"github.com/spf13/cobra"
)

func genkey(cfg *config.Config, overwrite bool) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	wallet, err := crypto.NewWallet(ctx)
	if err != nil {
		return err
	}

	err = os.MkdirAll(crypto.WALLET_PATH, 0o755)
	if err != nil {
		return err
	}

	err = wallet.SaveWallet(
		ctx,
		crypto.WALLET_PATH_PRIVATE_KEY,
		crypto.WALLET_PATH_PUBLIC_KEY,
		crypto.WALLET_PATH_NODE_ADDRESS,
		overwrite,
	)
	if err != nil {
		return err
	}

	return nil
}

func init() {
	cmdGenKey := &cobra.Command{
		Use:   "genkey",
		Short: "Generate a new node key pair",
		RunE: func(cmd *cobra.Command, args []string) error {
			overwrite, err := cmd.Flags().GetBool("overwrite")
			if err != nil {
				return err
			}
			return genkey(cmdConfig, overwrite)
		},
	}
	cmdGenKey.Flags().Bool("overwrite", false, "Overwrite existing key files")

	rootCmd.AddCommand(cmdGenKey)
}
