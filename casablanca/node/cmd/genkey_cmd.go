package cmd

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"context"
	"os"

	"github.com/spf13/cobra"
)

func genkey(cfg *config.Config, overwrite bool) error {
	ctx := context.Background()

	wallet, err := crypto.NewWallet(ctx)
	if err != nil {
		return err
	}

	err = os.MkdirAll(crypto.WALLET_PATH, 0755)
	if err != nil {
		return err
	}

	err = wallet.SaveWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY, crypto.WALLET_PATH_PUBLIC_KEY, crypto.WALLET_PATH_NODE_ADDRESS, overwrite)
	if err != nil {
		return err
	}

	return nil
}

func init() {
	cmd := &cobra.Command{
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

	cmd.Flags().Bool("overwrite", false, "Overwrite existing key files")

	rootCmd.AddCommand(cmd)
}
