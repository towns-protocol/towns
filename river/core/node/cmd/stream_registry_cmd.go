package cmd

import (
	"context"
	"fmt"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"

	"github.com/spf13/cobra"
)

func srdump(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(ctx, &cfg.RiverChain, nil)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(ctx, blockchain, &cfg.RegistryContract)
	if err != nil {
		return err
	}

	streamNum, err := registryContract.GetStreamCount(ctx)
	if err != nil {
		return err
	}

	fmt.Printf("Stream count reported: %d\n", streamNum)

	streams, err := registryContract.GetAllStreams(ctx, 0)
	if err != nil {
		return err
	}

	for i, strm := range streams {
		s := fmt.Sprintf("%4d %s", i, strm.StreamId.String())
		fmt.Printf("%-69s %4d, %s\n", s, strm.LastMiniblockNum, strm.LastMiniblockHash.Hex())
		for _, node := range strm.Nodes {
			fmt.Printf("        %s\n", node.Hex())
		}
	}

	return nil
}

func srstream(cfg *config.Config, streamId string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(ctx, &cfg.RiverChain, nil)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(ctx, blockchain, &cfg.RegistryContract)
	if err != nil {
		return err
	}

	id, err := StreamIdFromString(streamId)
	if err != nil {
		return err
	}

	stream, err := registryContract.GetStream(ctx, id)
	if err != nil {
		return err
	}

	fmt.Printf("%d %s\n", stream.LastMiniblockNum, stream.LastMiniblockHash.Hex())
	for _, node := range stream.Nodes {
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
