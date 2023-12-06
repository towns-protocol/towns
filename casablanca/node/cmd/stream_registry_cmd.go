package cmd

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/registries"
	"context"
	"encoding/hex"
	"fmt"

	"github.com/spf13/cobra"
)

func srdump(cfg *config.Config) error {
	ctx := context.Background()

	blockchain, err := crypto.NewReadOnlyBlockchain(ctx, &cfg.RiverChain)
	if err != nil {
		return err
	}

	streamRegistryContract, err := registries.NewStreamRegistryContract(ctx, blockchain, &cfg.RegistryContract)
	if err != nil {
		return err
	}

	streamNum, err := streamRegistryContract.GetStreamsLength(ctx)
	if err != nil {
		return err
	}

	fmt.Printf("Number of stream slots in stream registry: %d\n", streamNum)

	for i := int64(0); i < streamNum; i++ {
		streamId, nodes, hash, err := streamRegistryContract.GetStreamByIndex(ctx, i)
		if err != nil {
			return err
		}
		s := fmt.Sprintf("%4d %s", i, streamId)
		fmt.Printf("%-54s %s\n", s, hex.EncodeToString(hash))
		for _, node := range nodes {
			fmt.Printf("        %s\n", node)
		}
	}

	return nil
}

func srstream(cfg *config.Config, streamId string) error {
	ctx := context.Background()

	blockchain, err := crypto.NewReadOnlyBlockchain(ctx, &cfg.RiverChain)
	if err != nil {
		return err
	}

	streamRegistryContract, err := registries.NewStreamRegistryContract(ctx, blockchain, &cfg.RegistryContract)
	if err != nil {
		return err
	}

	nodes, hash, err := streamRegistryContract.GetStream(ctx, streamId)
	if err != nil {
		return err
	}

	fmt.Printf("%s\n", hex.EncodeToString(hash))
	for _, node := range nodes {
		fmt.Printf("%s\n", node)
	}

	return nil
}

func init() {
	srCmd := &cobra.Command{
		Use:     "stream-registry",
		Aliases: []string{"sr"},
		Short:   "Stream registry management commands",
	}
	rootCmd.AddCommand(srCmd)

	srCmd.AddCommand(&cobra.Command{
		Use:   "dump",
		Short: "Dump stream registry",
		RunE: func(cmd *cobra.Command, args []string) error {
			return srdump(cmdConfig)
		},
	})

	srCmd.AddCommand(&cobra.Command{
		Use:   "stream <stream-id>",
		Short: "Get stream info from stream registry",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return srstream(cmdConfig, args[0])
		},
	})
}
