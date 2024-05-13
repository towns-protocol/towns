package rpc

import (
	"context"
	"math/big"
	"sync"
	"sync/atomic"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
)

type archiveStream struct {
	streamId            StreamId
	nodes               nodes.StreamNodes
	numBlocksInContract uint64

	loadedFromDb  bool
	numBlocksInDb uint64

	mu sync.Mutex
}

type Archiver struct {
	config       *config.ArchiveConfig
	contract     *registries.RiverRegistryContract
	nodeRegistry nodes.NodeRegistry
	storage      storage.StreamStorage

	tasks     chan *archiveTask
	workersWG sync.WaitGroup

	// tasksWG is used in single run mode: it archives everything there is to archive and exits
	tasksWG *sync.WaitGroup

	streams sync.Map

	// set to done when archiver has started
	startedWG sync.WaitGroup

	streamCount     atomic.Uint64
	successOpsCount atomic.Uint64
	failedOpsCount  atomic.Uint64
}

type archiveTask struct {
	stream *contracts.StreamWithId
}

func NewArchiver(
	config *config.ArchiveConfig,
	contract *registries.RiverRegistryContract,
	nodeRegistry nodes.NodeRegistry,
	storage storage.StreamStorage,
) *Archiver {
	a := &Archiver{
		config:       config,
		contract:     contract,
		nodeRegistry: nodeRegistry,
		storage:      storage,
		tasks:        make(chan *archiveTask, 10000), // TODO: setting
	}
	a.startedWG.Add(1)
	return a
}

// TODO: add block number to reject older updates
func (a *Archiver) ArchiveStream(ctx context.Context, streamWithId *contracts.StreamWithId) error {
	log := dlog.FromCtx(ctx)

	streamId, err := StreamIdFromHash(streamWithId.Id)
	if err != nil {
		return err
	}

	record, ok := a.streams.Load(streamId)
	if !ok {
		var loaded bool
		record, loaded = a.streams.LoadOrStore(
			streamId,
			&archiveStream{
				streamId:            streamId,
				nodes:               nodes.NewStreamNodes(streamWithId.Stream.Nodes, common.Address{}),
				numBlocksInContract: streamWithId.Stream.LastMiniblockNum + 1,
			},
		)
		if !loaded {
			a.streamCount.Add(1)
		}
	}

	stream := record.(*archiveStream)

	// TODO: TryLock and reschedule task
	stream.mu.Lock()
	defer stream.mu.Unlock()

	numBlocksInContract := streamWithId.Stream.LastMiniblockNum + 1
	if stream.numBlocksInContract > numBlocksInContract {
		log.Info("Skipping old update out of order", "streamId", streamId, "mbSeenBefore", stream.numBlocksInContract, "mbGotInTask", numBlocksInContract)
		return nil
	}
	stream.numBlocksInContract = numBlocksInContract

	if !stream.loadedFromDb {
		maxBlockNum, err := a.storage.GetMaxArchivedMiniblockNumber(ctx, streamId)
		if err != nil && AsRiverError(err).Code == Err_NOT_FOUND {
			err = a.storage.CreateStreamArchiveStorage(ctx, streamId)
			if err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			stream.numBlocksInDb = uint64(maxBlockNum + 1)
		}
		stream.loadedFromDb = true
	}

	log.Debug("Archiving stream", "streamId", streamId, "numBlocksInDb", stream.numBlocksInDb, "numBlocksInContract", stream.numBlocksInContract)

	if stream.numBlocksInDb >= stream.numBlocksInContract {
		return nil
	}

	nodeAddr := stream.nodes.GetStickyPeer()

	stub, err := a.nodeRegistry.GetStreamServiceClientForAddress(nodeAddr)
	if err != nil {
		return err
	}

	for stream.numBlocksInDb < stream.numBlocksInContract {
		toBlock := min(stream.numBlocksInDb+a.config.GetReadMiniblocksSize(), stream.numBlocksInContract)
		resp, err := stub.GetMiniblocks(
			ctx,
			connect.NewRequest(&GetMiniblocksRequest{
				StreamId:      stream.streamId[:],
				FromInclusive: int64(stream.numBlocksInDb),
				ToExclusive:   int64(toBlock),
			}),
		)
		if err != nil {
			stream.nodes.AdvanceStickyPeer(nodeAddr)
			return err
		}

		msg := resp.Msg
		if len(msg.Miniblocks) == 0 {
			return RiverError(Err_INTERNAL, "GetMiniblocks returned empty miniblocks", "streamId", stream.streamId)
		}

		// Validate miniblocks are sequential.
		// TODO: validate miniblock signatures.
		var serialized [][]byte
		for i, mb := range msg.Miniblocks {
			// Parse header
			info, err := events.NewMiniblockInfoFromProto(
				mb,
				events.NewMiniblockInfoFromProtoOpts{
					ExpectedBlockNumber: int64(i) + int64(stream.numBlocksInDb),
					DontParseEvents:     true,
				},
			)
			if err != nil {
				return err
			}
			bb, err := info.ToBytes()
			if err != nil {
				return err
			}
			serialized = append(serialized, bb)
		}

		log.Debug("Writing miniblocks to storage", "streamId", streamId, "numBlocks", len(serialized))

		err = a.storage.WriteArchiveMiniblocks(ctx, streamId, int64(stream.numBlocksInDb), serialized)
		if err != nil {
			return err
		}
		stream.numBlocksInDb += uint64(len(serialized))
	}
	return nil
}

func (a *Archiver) Start(ctx context.Context, exitSignal chan<- error) {
	defer a.startedWG.Done()
	err := a.startImpl(ctx)
	if err != nil {
		exitSignal <- err
	}
}

func (a *Archiver) startImpl(ctx context.Context) error {
	// TODO: run mode setting, for now it's always single run
	a.tasksWG = &sync.WaitGroup{}

	// TODO: setting
	const numWorkers = 20
	for i := 0; i < numWorkers; i++ {
		a.workersWG.Add(1)
		go a.worker(ctx)
	}

	// TODO: setting
	const pageSize = int64(5000)

	blockNum := a.contract.Blockchain.InitialBlockNum

	callOpts := &bind.CallOpts{
		Context:     ctx,
		BlockNumber: blockNum.AsBigInt(),
	}

	lastPage := false
	var err error
	var streams []contracts.StreamWithId
	for i := int64(0); !lastPage; i += pageSize {
		streams, lastPage, err = a.contract.StreamRegistry.GetPaginatedStreams(callOpts, big.NewInt(i), big.NewInt(i+pageSize))
		if err != nil {
			return WrapRiverError(
				Err_CANNOT_CALL_CONTRACT,
				err,
			).Func("archiver.start").
				Message("StreamRegistry.GetPaginatedStreamsGetPaginatedStreams smart contract call failed")
		}
		for _, stream := range streams {
			if stream.Id == registries.ZeroBytes32 {
				continue
			}
			a.tasks <- &archiveTask{stream: &stream}
			if a.tasksWG != nil {
				a.tasksWG.Add(1)
			}
		}
	}

	return nil
}

func (a *Archiver) WaitForWorkers() {
	a.workersWG.Wait()
}

func (a *Archiver) WaitForTasks() {
	a.tasksWG.Wait()
}

func (a *Archiver) WaitForStart() {
	a.startedWG.Wait()
}

func (a *Archiver) GetStats() (uint64, uint64, uint64) {
	return a.streamCount.Load(), a.successOpsCount.Load(), a.failedOpsCount.Load()
}

func (a *Archiver) worker(ctx context.Context) {
	log := dlog.FromCtx(ctx)

	defer a.workersWG.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case task := <-a.tasks:
			err := a.ArchiveStream(ctx, task.stream)
			if err != nil {
				log.Error("archiver.worker: Failed to archive stream", "error", err)
				a.failedOpsCount.Add(1)
			} else {
				a.successOpsCount.Add(1)
			}
			if a.tasksWG != nil {
				a.tasksWG.Done()
			}
		}
	}
}
