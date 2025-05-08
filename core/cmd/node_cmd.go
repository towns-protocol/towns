package cmd

import (
	"context"
	"encoding/hex"
	"fmt"
	"math/big"
	"strconv"

	"github.com/ethereum/go-ethereum/common"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/registries"
)

func runNodeGetStreams(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	nodeAddress := common.HexToAddress(args[0])
	zeroAddress := common.Address{}
	if nodeAddress == zeroAddress {
		return fmt.Errorf("invalid argument 0: node-address")
	}

	var err error
	offset := int64(0)
	if len(args) > 1 {
		offset, err = strconv.ParseInt(args[1], 10, 64)
		if err != nil {
			return fmt.Errorf("expected offset to be a non-negative integer: %w", err)
		}
	}

	chunkSize := int64(100)
	if len(args) > 2 {
		chunkSize, err = strconv.ParseInt(args[2], 10, 64)
		if err != nil {
			return fmt.Errorf("expected chunksize to be an integer: %w", err)
		}
	}

	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cmdConfig.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cmdConfig.RegistryContract,
		&cmdConfig.RiverRegistry,
	)
	if err != nil {
		return err
	}

	streamsWithIds, err := registryContract.StreamRegistry.GetPaginatedStreamsOnNode(
		nil,
		nodeAddress,
		big.NewInt(offset),
		big.NewInt(offset+chunkSize),
	)
	if err != nil {
		return fmt.Errorf("error reading stream registry: %w", err)
	}

	fmt.Println("Stream Id, Replication Factor")
	fmt.Println("=============================")
	for _, stream := range streamsWithIds {
		fmt.Printf("%v: %d\n", hex.EncodeToString(stream.Id[:]), stream.ReplicationFactor())
	}
	return nil
}

func init() {
	cmdNode := &cobra.Command{
		Use:   "node",
		Short: "Access stream data",
	}

	cmdNodeStreams := &cobra.Command{
		Use:   "streams",
		Short: "Get paginated streams on node <node-address> [offset] [chunk-size]",
		Long: `Print the list of streams assigned to a node.
offset is optional and specifies where the registry should start reading from in the list of streams per node.
chunk-size is also optional and specifies how many streams should be read.`,
		Args: cobra.RangeArgs(1, 3),
		RunE: runNodeGetStreams,
	}

	cmdNode.AddCommand(cmdNodeStreams)
	rootCmd.AddCommand(cmdNode)
}
