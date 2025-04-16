package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/accounts/keystore"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/gammazero/workerpool"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/rpc"
	"github.com/towns-protocol/towns/core/node/shared"
)

const StreamSetReplicationFactorRequestsBatchSize = 75

type (
	StreamNotMigrated struct {
		StreamID          shared.StreamId  `json:"stream_id"`
		ReplicationFactor uint8            `json:"replication_factor"`
		Status            string           `json:"status"`
		NodeAddresses     []common.Address `json:"node_addresses"`
	}

	streamPlacementTxResult struct {
		StreamID      shared.StreamId  `json:"stream_id"`
		Status        string           `json:"status"`
		TxHash        common.Hash      `json:"tx_hash"`
		NodeAddresses []common.Address `json:"node_addresses"`
	}

	streamSyncNodeStatus struct {
		Status      string `json:"status"`
		MinipoolGen int64  `json:"minipool_gen,omitempty"`
		Error       string `json:"error,omitempty"`
	}

	streamSyncStatus struct {
		StreamID shared.StreamId `json:"stream_id"`
		Nodes    map[common.Address]streamSyncNodeStatus
	}
)

var (
	// DontReplicateToTheseNodes contains the list of nodes that we don't want to replicate streams to.
	DontReplicateToTheseNodes = []common.Address{
		common.HexToAddress("0xa7f7D83843aB78706344D3Ae882b1d4f9404F254"), // axol1
		common.HexToAddress("0x01A7dCd51409758f220c171c209eF3E1C8b10F1E"), // axol2
		common.HexToAddress("0xC6CF68A1BCD3B9285fe1d13c128953a14Dd1Bb60"), // axol3
		common.HexToAddress("0x14D237838A619784c831E3A690AbceB2df953F26"), // bravo2
	}
	RiverStreamNodes = []common.Address{
		common.HexToAddress("0xC5FB45BDb448766135ce634bD1Da34D483ADd382"), // river1
		common.HexToAddress("0xB85dd7d21Bc093DAe6f1b56a20a45ec1770D11dD"), // river2
		common.HexToAddress("0xc69ceBB1e84Ca8dda9a9Ad68D345Fbe4Ac21Fd54"), // river3
	}
)

func loadWallet(walletFile string) (*crypto.Wallet, error) {
	walletFileContents, err := os.ReadFile(walletFile)
	if err != nil {
		return nil, err
	}

	key, err := keystore.DecryptKey(walletFileContents, "")
	if err != nil {
		return nil, err
	}

	return &crypto.Wallet{
		PrivateKeyStruct: key.PrivateKey,
		PrivateKey:       eth_crypto.FromECDSA(key.PrivateKey),
		Address:          eth_crypto.PubkeyToAddress(key.PrivateKey.PublicKey),
	}, nil
}

func initBlockchain(ctx context.Context, wallet *crypto.Wallet) (
	*crypto.Blockchain,
	*registries.RiverRegistryContract,
	error,
) {
	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cmdConfig.RiverChain,
		wallet,
		infra.NewMetricsFactory(nil, "river", "cmdline"),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	registryContract, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cmdConfig.RegistryContract,
		&cmdConfig.RiverRegistry,
	)
	if err != nil {
		return nil, nil, err
	}

	return blockchain, registryContract, nil
}

func runStreamAllMigrationListCmd(cmd *cobra.Command, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, registryContract, err := initBlockchain(ctx, nil)
	if err != nil {
		return err
	}

	fileOutputs := make(map[string]*os.File)
	streamOutputs := make(map[string]*json.Encoder)

	defer func() {
		for _, outputFile := range fileOutputs {
			outputFile.Close()
		}
	}()

	registryContract.ForAllStreams(ctx, blockchain.InitialBlockNum, func(streamWithID *river.StreamWithId) bool {
		stream := streamWithID.Stream
		if len(stream.Nodes) == 1 {
			streams := &StreamNotMigrated{
				StreamID:          streamWithID.Id,
				ReplicationFactor: uint8(stream.StreamReplicationFactor()),
				Status:            "not_migrated",
				NodeAddresses:     stream.Nodes,
			}

			key := fmt.Sprintf("%s.%02x", stream.Nodes[0].Hex(), streamWithID.Id[0])

			output, ok := streamOutputs[key]
			if !ok {
				outputFilename := fmt.Sprintf(
					"%s/%s_%02x.streams",
					args[0],
					strings.ToLower(stream.Nodes[0].Hex()),
					streamWithID.Id[0],
				)
				outputFile, err := os.OpenFile(outputFilename, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
				if err != nil {
					panic(err)
				}
				output = json.NewEncoder(outputFile)

				fileOutputs[key] = outputFile
				streamOutputs[key] = output
			}

			if err := streamOutputs[key].Encode(streams); err != nil {
				panic(err)
			}
		}

		return true
	})

	return nil
}

func runStreamMigrationListCmd(cmd *cobra.Command, args []string) error {
	limit := 0
	if len(args) >= 2 {
		n, err := strconv.ParseInt(args[1], 10, 64)
		if err != nil {
			return err
		}
		limit = int(n)
	}

	var nodeAddress common.Address
	if len(args) >= 3 {
		nodeAddress = common.HexToAddress(args[2])
		if nodeAddress == (common.Address{}) {
			return fmt.Errorf("invalid node address: %s", args[2])
		}
	}

	outputFile, err := os.OpenFile(args[0], os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	output := json.NewEncoder(outputFile)

	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, registryContract, err := initBlockchain(ctx, nil)
	if err != nil {
		return err
	}

	var (
		streams = make(chan *StreamNotMigrated, 10*1024)
		dumped  = 0
		tasks   sync.WaitGroup
	)

	tasks.Add(1)
	go func() {
		for streamNotMigrated := range streams {
			if err := output.Encode(streamNotMigrated); err != nil {
				panic(err)
			}
		}
		tasks.Done()
	}()

	if nodeAddress == (common.Address{}) {
		registryContract.ForAllStreams(ctx, blockchain.InitialBlockNum, func(streamWithID *river.StreamWithId) bool {
			stream := streamWithID.Stream
			if len(stream.Nodes) == 1 {
				streams <- &StreamNotMigrated{
					StreamID:          streamWithID.Id,
					ReplicationFactor: uint8(stream.StreamReplicationFactor()),
					Status:            "not_migrated",
					NodeAddresses:     stream.Nodes,
				}
				dumped++
			}
			return limit == 0 || dumped < limit
		})
	} else {
		registryContract.ForStreamsOnNode(ctx, blockchain.InitialBlockNum, nodeAddress, func(streamWithID *river.StreamWithId) bool {
			stream := streamWithID.Stream
			if len(stream.Nodes) == 1 || len(stream.Nodes) != stream.StreamReplicationFactor() {
				streams <- &StreamNotMigrated{
					StreamID:          streamWithID.Id,
					ReplicationFactor: uint8(stream.StreamReplicationFactor()),
					Status:            "not_migrated",
					NodeAddresses:     stream.Nodes,
				}
				dumped++
			}
			return limit == 0 || dumped < limit
		})
	}

	close(streams)
	tasks.Wait()

	return nil
}

func runStreamPlaceInitiateCmd(cfg *config.Config, args []string) error {
	wallet, err := loadWallet(args[0])
	if err != nil {
		return err
	}

	n, err := strconv.ParseInt(args[2], 10, 8)
	if err != nil {
		return err
	}
	targetReplicationFactor := int(n)

	if targetReplicationFactor == 0 || targetReplicationFactor > 5 {
		return fmt.Errorf("invalid replication factor: %d", targetReplicationFactor)
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, registryContract, err := initBlockchain(ctx, wallet)
	if err != nil {
		return err
	}

	configCaller, err := river.NewRiverConfigV1Caller(cfg.RegistryContract.Address, blockchain.Client)
	if err != nil {
		return err
	}

	isConfigurationManager, err := configCaller.IsConfigurationManager(nil, wallet.Address)
	if err != nil {
		return err
	}

	if !isConfigurationManager {
		return fmt.Errorf("address %s is not a configuration manager", wallet.Address)
	}

	decoder, err := crypto.NewEVMErrorDecoder(
		river.StreamRegistryV1MetaData,
		river.RiverConfigV1MetaData,
		river.NodeRegistryV1MetaData,
		river.StreamRegistryV1MetaData)
	if err != nil {
		return err
	}

	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return err
	}

	onChainConfig, err := crypto.NewOnChainConfig(
		ctx,
		blockchain.Client,
		registryContract.Address,
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	nodeRegistry, err := nodes.LoadNodeRegistry(ctx, registryContract, common.Address{}, blockchain.InitialBlockNum,
		blockchain.ChainMonitor, onChainConfig, httpClient, nil)
	if err != nil {
		return err
	}

	nodesToOperator := make(map[common.Address]common.Address)
	operatorToNodes := make(map[common.Address][]common.Address)
	for _, node := range nodeRegistry.GetAllNodes() {
		nodesToOperator[node.Address()] = node.Operator()
		operatorToNodes[node.Operator()] = append(operatorToNodes[node.Operator()], node.Address())
	}

	allowMultipleNodesFromSameOperator := len(operatorToNodes) < targetReplicationFactor

	inputFile, err := os.ReadFile(args[1])
	if err != nil {
		return err
	}

	// decode input file and ensure that all stream node lists are max targetReplicationFactor length
	var (
		streamSetReplicationFactorRequests []river.SetStreamReplicationFactor
		inputJSON                          = json.NewDecoder(bytes.NewReader(inputFile))
	)

	i := 0
	for {
		i++

		var record StreamNotMigrated

		err := inputJSON.Decode(&record)
		if errors.Is(err, io.EOF) {
			break
		}

		if err != nil {
			return err
		}

		record.NodeAddresses = append(record.NodeAddresses, RiverStreamNodes[i%len(RiverStreamNodes)])

		if len(record.NodeAddresses) > targetReplicationFactor {
			return fmt.Errorf(
				"invalid number of nodes for stream %s: %d, replication factor: %d",
				record.StreamID,
				len(record.NodeAddresses),
				targetReplicationFactor,
			)
		}

		// add random nodes to ensure that the number of stream nodes is the targeted replication factor
		// ensure that newly added nodes are from different operators
		choosenStreamNodes, err := nodeRegistry.ChooseStreamNodes(ctx, record.StreamID, 5)
		if err != nil {
			return err
		}

		// copy existing stream node
		var streamNodeOperators []common.Address
		for _, addr := range record.NodeAddresses {
			streamNodeOperators = append(streamNodeOperators, nodesToOperator[addr])
		}

		for _, addr := range choosenStreamNodes {
			if len(record.NodeAddresses) >= targetReplicationFactor {
				break
			}

			if slices.Contains(DontReplicateToTheseNodes, addr) {
				continue
			}

			if slices.Contains(record.NodeAddresses, addr) { // no duplicate nodes
				continue
			}

			operator := nodesToOperator[addr]

			if !allowMultipleNodesFromSameOperator {
				// if enough operators available don't use 2 nodes from the same operator
				if slices.Contains(streamNodeOperators, operator) {
					continue
				}
			}

			record.NodeAddresses = append(record.NodeAddresses, addr)
			streamNodeOperators = append(streamNodeOperators, operator)
		}

		if len(record.NodeAddresses) != targetReplicationFactor {
			return fmt.Errorf("unable to add enough nodes to stream %s", record.StreamID)
		}

		streamSetReplicationFactorRequests = append(
			streamSetReplicationFactorRequests,
			river.SetStreamReplicationFactor{
				StreamId:          record.StreamID,
				Nodes:             record.NodeAddresses,
				ReplicationFactor: record.ReplicationFactor,
			},
		)
	}

	outputFile, err := os.OpenFile(args[1]+".initiated", os.O_EXCL|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	output := json.NewEncoder(outputFile)

	for requests := range slices.Chunk(streamSetReplicationFactorRequests, StreamSetReplicationFactorRequestsBatchSize) {
		pendingTx, err := blockchain.TxPool.Submit(
			ctx,
			"StreamRegistry::SetStreamReplicationFactor",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return registryContract.StreamRegistry.SetStreamReplicationFactor(opts, requests)
			},
		)
		if err != nil {
			cs, st, err := decoder.DecodeEVMError(err)
			fmt.Printf("submit err: %v %v %v\n", cs, st, err)
			return err
		}

		receipt, err := pendingTx.Wait(ctx)
		if err != nil {
			return err
		}

		var results []*streamPlacementTxResult
		for _, req := range requests {
			results = append(results, &streamPlacementTxResult{
				Status:        "pending",
				StreamID:      req.StreamId,
				NodeAddresses: req.Nodes,
			})
		}

		switch receipt.Status {
		case types.ReceiptStatusSuccessful:
			for _, result := range results {
				result.Status = "success"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
		case types.ReceiptStatusFailed:
			for _, result := range results {
				result.Status = "failed"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
			return fmt.Errorf("transaction %s failed", receipt.TxHash)
		default:
			return fmt.Errorf("invalid transaction status: %d", receipt.Status)
		}
	}

	return nil
}

func runStreamPlaceStatusCmd(cfg *config.Config, args []string) error {
	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, registryContract, err := initBlockchain(ctx, nil)
	if err != nil {
		return err
	}

	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return err
	}

	onChainConfig, err := crypto.NewOnChainConfig(
		ctx,
		blockchain.Client,
		registryContract.Address,
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	nodeRegistry, err := nodes.LoadNodeRegistry(ctx, registryContract, common.Address{}, blockchain.InitialBlockNum,
		blockchain.ChainMonitor, onChainConfig, httpClient, nil)
	if err != nil {
		return err
	}

	inputFile, err := os.Open(args[0])
	if err != nil {
		return err
	}
	defer inputFile.Close()

	input := json.NewDecoder(inputFile)

	outputSink, err := os.OpenFile(args[0]+".status", os.O_EXCL|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		outputSink = os.Stdout
	}
	defer outputSink.Close()

	output := json.NewEncoder(outputSink)

	var streamPlacementTxResults []*streamPlacementTxResult
	for {
		var result streamPlacementTxResult
		if err := input.Decode(&result); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return err
		}
		streamPlacementTxResults = append(streamPlacementTxResults, &result)
	}

	var (
		wp        = workerpool.New(4)
		results   = make(chan *streamSyncStatus, wp.Size())
		getStatus = func(stream *streamPlacementTxResult) func() {
			return func() {
				status := &streamSyncStatus{
					StreamID: stream.StreamID,
					Nodes:    make(map[common.Address]streamSyncNodeStatus),
				}

				for _, nodeAddress := range stream.NodeAddresses {
					if stream.Status != "success" {
						status.Nodes[nodeAddress] = streamSyncNodeStatus{
							Status: "failed",
							Error:  "initiate tx failed",
						}
						continue
					}

					streamServiceClient, err := nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
					if err != nil {
						status.Nodes[nodeAddress] = streamSyncNodeStatus{
							Status: "failed",
							Error:  err.Error(),
						}
						continue
					}

					request := connect.NewRequest(&protocol.GetStreamRequest{StreamId: stream.StreamID[:]})
					request.Header().Set(rpc.RiverNoForwardHeader, rpc.RiverHeaderTrueValue)
					request.Header().Set(rpc.RiverAllowNoQuorumHeader, rpc.RiverHeaderTrueValue)

					ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
					response, err := streamServiceClient.GetStream(ctx, request)
					cancel()
					if err != nil {
						status.Nodes[nodeAddress] = streamSyncNodeStatus{
							Status: "failed",
							Error:  err.Error(),
						}
						continue
					}

					status.Nodes[nodeAddress] = streamSyncNodeStatus{
						Status:      "success",
						MinipoolGen: response.Msg.GetStream().GetNextSyncCookie().GetMinipoolGen(),
					}
				}

				results <- status
			}
		}
	)

	go func() {
		for _, stream := range streamPlacementTxResults {
			wp.Submit(getStatus(stream))
		}
		wp.StopWait()
		close(results)
	}()

	for result := range results {
		output.Encode(result)
	}

	return nil
}

func isConsistent(record streamSyncStatus) bool {
	minBlock := int64(math.MaxInt64)
	maxBlock := int64(math.MinInt64)

	for _, nodeStatus := range record.Nodes {
		minBlock = min(minBlock, nodeStatus.MinipoolGen)
		maxBlock = max(maxBlock, nodeStatus.MinipoolGen)
	}

	return maxBlock >= 0 && maxBlock-minBlock <= 5
}

func runStreamPlaceEnterQuorumCmd(cfg *config.Config, args []string) error {
	wallet, err := loadWallet(args[0])
	if err != nil {
		return err
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, registryContract, err := initBlockchain(ctx, wallet)

	configCaller, err := river.NewRiverConfigV1Caller(cfg.RegistryContract.Address, blockchain.Client)
	if err != nil {
		return err
	}

	isConfigurationManager, err := configCaller.IsConfigurationManager(nil, wallet.Address)
	if err != nil {
		return err
	}

	if !isConfigurationManager {
		return fmt.Errorf("address %s is not a configuration manager", wallet.Address)
	}

	inputFile, err := os.ReadFile(args[1])
	if err != nil {
		return err
	}

	// decode input file and ensure that all stream node lists are max targetReplicationFactor length
	// and all nodes are in sync before they enter quorum.
	var (
		streamSetReplicationFactorRequests         []river.SetStreamReplicationFactor
		streamSetReplicationFactorRequestsFailures []river.SetStreamReplicationFactor

		inputJSON = json.NewDecoder(bytes.NewReader(inputFile))
	)

	for {
		var record streamSyncStatus

		err := inputJSON.Decode(&record)
		if errors.Is(err, io.EOF) {
			break
		}

		if err != nil {
			return err
		}

		if !isConsistent(record) {
			// ensure that removed nodes are always in front of the node list
			var nodeAddresses []common.Address
			var removedStreamNodes []common.Address
			for nodeAddr := range record.Nodes {
				if slices.Contains(DontReplicateToTheseNodes, nodeAddr) {
					removedStreamNodes = append(removedStreamNodes, nodeAddr)
				} else {
					nodeAddresses = append(nodeAddresses, nodeAddr)
				}
			}

			nodes := append(removedStreamNodes, nodeAddresses...)
			streamSetReplicationFactorRequestsFailures = append(
				streamSetReplicationFactorRequestsFailures,
				river.SetStreamReplicationFactor{
					StreamId:          record.StreamID,
					Nodes:             nodes,
					ReplicationFactor: uint8(len(nodes)),
				},
			)

			continue
		}

		// ensure that removed nodes are always in back of the node list so it's only marked as a sync node
		nodes := make([]common.Address, 0, len(record.Nodes))
		var removedNodes []common.Address
		for node := range record.Nodes {
			if slices.Contains(DontReplicateToTheseNodes, node) {
				removedNodes = append(removedNodes, node)
			} else {
				nodes = append(nodes, node)
			}
		}
		nodes = append(nodes, removedNodes...)

		streamSetReplicationFactorRequests = append(
			streamSetReplicationFactorRequests,
			river.SetStreamReplicationFactor{
				StreamId:          record.StreamID,
				Nodes:             nodes,
				ReplicationFactor: uint8(len(nodes) - len(removedNodes)),
			},
		)
	}

	if len(streamSetReplicationFactorRequestsFailures) > 0 {
		for _, inconsistentStream := range streamSetReplicationFactorRequestsFailures {
			fmt.Printf("stream %x is inconsistent\n", inconsistentStream.StreamId)
		}
		return nil
	}

	outputFile, err := os.OpenFile(args[1]+".enter_quorum", os.O_EXCL|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	output := json.NewEncoder(outputFile)

	decoder, err := crypto.NewEVMErrorDecoder(
		river.StreamRegistryV1MetaData,
		river.RiverConfigV1MetaData,
		river.NodeRegistryV1MetaData,
		river.StreamRegistryV1MetaData)
	if err != nil {
		return err
	}

	for requests := range slices.Chunk(streamSetReplicationFactorRequests, StreamSetReplicationFactorRequestsBatchSize) {
		pendingTx, err := blockchain.TxPool.Submit(
			ctx,
			"StreamRegistry::SetStreamReplicationFactor",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return registryContract.StreamRegistry.SetStreamReplicationFactor(opts, requests)
			},
		)
		if err != nil {
			cs, st, err := decoder.DecodeEVMError(err)
			fmt.Printf("submit err: %v %v %v\n", cs, st, err)
			return err
		}

		receipt, err := pendingTx.Wait(ctx)
		if err != nil {
			return err
		}

		var results []*streamPlacementTxResult
		for _, req := range requests {
			results = append(results, &streamPlacementTxResult{
				Status:        "pending",
				StreamID:      req.StreamId,
				NodeAddresses: req.Nodes,
			})
		}

		switch receipt.Status {
		case types.ReceiptStatusSuccessful:
			for _, result := range results {
				result.Status = "success"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
		case types.ReceiptStatusFailed:
			for _, result := range results {
				result.Status = "failed"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
			return fmt.Errorf("transaction %s failed", receipt.TxHash)
		default:
			return fmt.Errorf("invalid transaction status: %d", receipt.Status)
		}
	}

	return nil
}

func cmdStreamPlaceRemoveDroppedNodesCmd(cfg *config.Config, args []string) error {
	wallet, err := loadWallet(args[0])
	if err != nil {
		return err
	}

	ctx := context.Background() // lint:ignore context.Background() is fine here

	blockchain, registryContract, err := initBlockchain(ctx, wallet)

	configCaller, err := river.NewRiverConfigV1Caller(cfg.RegistryContract.Address, blockchain.Client)
	if err != nil {
		return err
	}

	isConfigurationManager, err := configCaller.IsConfigurationManager(nil, wallet.Address)
	if err != nil {
		return err
	}

	if !isConfigurationManager {
		return fmt.Errorf("address %s is not a configuration manager", wallet.Address)
	}

	decoder, err := crypto.NewEVMErrorDecoder(
		river.StreamRegistryV1MetaData,
		river.RiverConfigV1MetaData,
		river.NodeRegistryV1MetaData,
		river.StreamRegistryV1MetaData)
	if err != nil {
		return err
	}

	inputFile, err := os.ReadFile(args[1])
	if err != nil {
		return err
	}

	inputJSON := json.NewDecoder(bytes.NewReader(inputFile))

	var streamSetReplicationFactorRequests []river.SetStreamReplicationFactor

	for {
		var record *streamPlacementTxResult

		err := inputJSON.Decode(&record)
		if errors.Is(err, io.EOF) {
			break
		}

		if err != nil {
			return err
		}

		if record.Status != "success" {
			continue
		}

		record.NodeAddresses = slices.DeleteFunc(record.NodeAddresses, func(node common.Address) bool {
			return slices.Contains(DontReplicateToTheseNodes, node)
		})

		if len(record.NodeAddresses) < 3 {
			return fmt.Errorf("stream %x has less than 3 nodes", record.StreamID)
		}

		streamSetReplicationFactorRequests = append(streamSetReplicationFactorRequests,
			river.SetStreamReplicationFactor{
				StreamId:          record.StreamID,
				Nodes:             record.NodeAddresses,
				ReplicationFactor: uint8(len(record.NodeAddresses)),
			},
		)
	}

	outputFile, err := os.OpenFile(args[1]+".dropped_ignored_nodes", os.O_EXCL|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer outputFile.Close()

	output := json.NewEncoder(outputFile)

	for requests := range slices.Chunk(streamSetReplicationFactorRequests, StreamSetReplicationFactorRequestsBatchSize) {
		pendingTx, err := blockchain.TxPool.Submit(
			ctx,
			"StreamRegistry::SetStreamReplicationFactor",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return registryContract.StreamRegistry.SetStreamReplicationFactor(opts, requests)
			},
		)
		if err != nil {
			cs, st, err := decoder.DecodeEVMError(err)
			fmt.Printf("submit err: %v %v %v\n", cs, st, err)
			return err
		}

		receipt, err := pendingTx.Wait(ctx)
		if err != nil {
			return err
		}

		var results []*streamPlacementTxResult
		for _, req := range requests {
			results = append(results, &streamPlacementTxResult{
				Status:        "pending",
				StreamID:      req.StreamId,
				NodeAddresses: req.Nodes,
			})
		}

		switch receipt.Status {
		case types.ReceiptStatusSuccessful:
			for _, result := range results {
				result.Status = "success"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
		case types.ReceiptStatusFailed:
			for _, result := range results {
				result.Status = "failed"
				result.TxHash = receipt.TxHash
				if err := output.Encode(result); err != nil {
					return err
				}
			}
			return fmt.Errorf("transaction %s failed", receipt.TxHash)
		default:
			return fmt.Errorf("invalid transaction status: %d", receipt.Status)
		}
	}

	return nil
}
