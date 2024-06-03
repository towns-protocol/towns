package cmd

import (
	"context"
	"fmt"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"

	"github.com/spf13/cobra"
)

func srdump(cfg *config.Config, countOnly bool) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here
	blockchain, err := crypto.NewBlockchain(ctx, &cfg.RiverChain, nil, infra.NewMetrics("river", "cmdline"))
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(ctx, blockchain, &cfg.RegistryContract)
	if err != nil {
		return err
	}
	fmt.Printf("Using block number: %d\n", blockchain.InitialBlockNum)

	streamNum, err := registryContract.GetStreamCount(ctx, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}
	fmt.Printf("Stream count reported: %d\n", streamNum)

	if countOnly {
		return nil
	}

	streams, err := registryContract.GetAllStreams(ctx, blockchain.InitialBlockNum)
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

	if streamNum != int64(len(streams)) {
		return RiverError(
			Err_INTERNAL,
			"Stream count mismatch",
			"GetStreamCount",
			streamNum,
			"GetAllStreams",
			len(streams),
		)
	}

	return nil
}

func srstream(cfg *config.Config, streamId string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(ctx, &cfg.RiverChain, nil, infra.NewMetrics("river", "cmdline"))
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

	fmt.Printf("StreamId: %s\n", stream.StreamId.String())
	fmt.Printf("Miniblock: %d %s\n", stream.LastMiniblockNum, stream.LastMiniblockHash.Hex())
	fmt.Println("IsSealed: ", stream.IsSealed)
	fmt.Println("Nodes:")
	for i, node := range stream.Nodes {
		fmt.Printf("  %d %s\n", i, node)
	}

	return nil
}

func nodesdump(cfg *config.Config) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, err := crypto.NewBlockchain(ctx, &cfg.RiverChain, nil, infra.NewMetrics("river", "cmdline"))
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(ctx, blockchain, &cfg.RegistryContract)
	if err != nil {
		return err
	}

	nodes, err := registryContract.GetAllNodes(ctx, blockchain.InitialBlockNum)
	if err != nil {
		return err
	}

	for i, node := range nodes {
		fmt.Printf(
			"%4d %s %s %d (%-11s) %s\n",
			i,
			node.NodeAddress.Hex(),
			node.Operator.Hex(),
			node.Status,
			contracts.NodeStatusString(node.Status),
			node.Url,
		)
	}

	return nil
}

func init() {
	srCmd := &cobra.Command{
		Use:     "registry",
		Aliases: []string{"reg"},
		Short:   "Stream registry management commands",
	}
	rootCmd.AddCommand(srCmd)

	streamsCmd := &cobra.Command{
		Use:   "streams",
		Short: "Dump stream records",
		RunE: func(cmd *cobra.Command, args []string) error {
			countOnly, err := cmd.Flags().GetBool("count")
			if err != nil {
				return err
			}
			return srdump(cmdConfig, countOnly)
		},
	}
	streamsCmd.Flags().Bool("count", false, "Only print the stream count")
	srCmd.AddCommand(streamsCmd)

	srCmd.AddCommand(&cobra.Command{
		Use:   "stream <stream-id>",
		Short: "Get stream info from stream registry",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return srstream(cmdConfig, args[0])
		},
	})

	srCmd.AddCommand(&cobra.Command{
		Use:   "nodes",
		Short: "Get node records from the registry contract",
		RunE: func(cmd *cobra.Command, args []string) error {
			return nodesdump(cmdConfig)
		},
	})
}
