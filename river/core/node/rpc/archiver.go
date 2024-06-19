package rpc

import (
	"context"
	"math/big"
	"sync"
	"sync/atomic"
	"time"

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

type ArchiveStream struct {
	streamId            StreamId
	nodes               nodes.StreamNodes
	numBlocksInContract atomic.Int64
	numBlocksInDb       atomic.Int64 // -1 means not loaded

	// Mutex is used so only one archive operation is performed at a time.
	mu sync.Mutex
}

func NewArchiveStream(streamId StreamId, nn *[]common.Address, lastKnownMiniblock uint64) *ArchiveStream {
	stream := &ArchiveStream{
		streamId: streamId,
		nodes:    nodes.NewStreamNodes(*nn, common.Address{}),
	}
	stream.numBlocksInContract.Store(int64(lastKnownMiniblock + 1))
	stream.numBlocksInDb.Store(-1)

	return stream
}

type Archiver struct {
	config       *config.ArchiveConfig
	contract     *registries.RiverRegistryContract
	nodeRegistry nodes.NodeRegistry
	storage      storage.StreamStorage

	tasks     chan StreamId
	workersWG sync.WaitGroup

	// tasksWG is used in single run mode: it archives everything there is to archive and exits
	tasksWG *sync.WaitGroup

	streams sync.Map

	// set to done when archiver has started
	startedWG sync.WaitGroup

	streamsExamined            atomic.Uint64
	streamsCreated             atomic.Uint64
	streamsUpToDate            atomic.Uint64
	successOpsCount            atomic.Uint64
	failedOpsCount             atomic.Uint64
	miniblocksProcessed        atomic.Uint64
	newStreamAllocated         atomic.Uint64
	streamPlacementUpdated     atomic.Uint64
	streamLastMiniblockUpdated atomic.Uint64
}

type ArchiverStats struct {
	StreamsExamined            uint64
	StreamsCreated             uint64
	StreamsUpToDate            uint64
	SuccessOpsCount            uint64
	FailedOpsCount             uint64
	MiniblocksProcessed        uint64
	NewStreamAllocated         uint64
	StreamPlacementUpdated     uint64
	StreamLastMiniblockUpdated uint64
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
		tasks:        make(chan StreamId, config.GetTaskQueueSize()),
	}
	a.startedWG.Add(1)
	return a
}

func (a *Archiver) addNewStream(
	ctx context.Context,
	streamId StreamId,
	nn *[]common.Address,
	lastKnownMiniblock uint64,
) {
	_, loaded := a.streams.Load(streamId)
	if loaded {
		// TODO: Double notificaion, shouldn't happen.
		dlog.FromCtx(ctx).
			Error("Stream already exists in archiver map", "streamId", streamId, "lastKnownMiniblock", lastKnownMiniblock)
		return
	}

	a.streams.Store(streamId, NewArchiveStream(streamId, nn, lastKnownMiniblock))

	a.tasks <- streamId

	a.streamsExamined.Add(1)
}

func (a *Archiver) ArchiveStream(ctx context.Context, stream *ArchiveStream) error {
	log := dlog.FromCtx(ctx)

	if !stream.mu.TryLock() {
		// Reschedule with delay.
		streamId := stream.streamId
		time.AfterFunc(time.Second, func() {
			a.tasks <- streamId
		})
		return nil
	}
	defer stream.mu.Unlock()

	mbsInDb := stream.numBlocksInDb.Load()

	// Check if stream info was loaded from db.
	if mbsInDb <= -1 {
		maxBlockNum, err := a.storage.GetMaxArchivedMiniblockNumber(ctx, stream.streamId)
		if err != nil && AsRiverError(err).Code == Err_NOT_FOUND {
			err = a.storage.CreateStreamArchiveStorage(ctx, stream.streamId)
			if err != nil {
				return err
			}
			a.streamsCreated.Add(1)

			mbsInDb = 0
			stream.numBlocksInDb.Store(mbsInDb)
		} else if err != nil {
			return err
		} else {
			mbsInDb = maxBlockNum + 1
			stream.numBlocksInDb.Store(mbsInDb)
		}
	}

	mbsInContract := stream.numBlocksInContract.Load()
	if mbsInDb >= mbsInContract {
		return nil
	}

	log.Debug(
		"Archiving stream",
		"streamId",
		stream.streamId,
		"numBlocksInDb",
		mbsInDb,
		"numBlocksInContract",
		mbsInContract,
	)

	if mbsInDb >= mbsInContract {
		a.streamsUpToDate.Add(1)
		return nil
	}

	nodeAddr := stream.nodes.GetStickyPeer()

	stub, err := a.nodeRegistry.GetStreamServiceClientForAddress(nodeAddr)
	if err != nil {
		return err
	}

	for mbsInDb < mbsInContract {
		toBlock := min(mbsInDb+int64(a.config.GetReadMiniblocksSize()), mbsInContract)
		resp, err := stub.GetMiniblocks(
			ctx,
			connect.NewRequest(&GetMiniblocksRequest{
				StreamId:      stream.streamId[:],
				FromInclusive: mbsInDb,
				ToExclusive:   toBlock,
			}),
		)
		if err != nil {
			stream.nodes.AdvanceStickyPeer(nodeAddr)
			return err
		}

		msg := resp.Msg
		if len(msg.Miniblocks) == 0 {
			log.Info(
				"ArchiveStream: GetMiniblocks returned empty miniblocks, remote storage is not up-to-date with contract yet",
				"streamId",
				stream.streamId,
				"fromInclusive",
				mbsInDb,
				"toExclusive",
				toBlock,
			)
			// Reschedule with delay.
			streamId := stream.streamId
			time.AfterFunc(time.Second, func() {
				a.tasks <- streamId
			})
			return nil
		}

		// Validate miniblocks are sequential.
		// TODO: validate miniblock signatures.
		var serialized [][]byte
		for i, mb := range msg.Miniblocks {
			// Parse header
			info, err := events.NewMiniblockInfoFromProto(
				mb,
				events.NewMiniblockInfoFromProtoOpts{
					ExpectedBlockNumber: int64(i) + mbsInDb,
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

		log.Debug("Writing miniblocks to storage", "streamId", stream.streamId, "numBlocks", len(serialized))

		err = a.storage.WriteArchiveMiniblocks(ctx, stream.streamId, mbsInDb, serialized)
		if err != nil {
			return err
		}
		mbsInDb += int64(len(serialized))
		stream.numBlocksInDb.Store(mbsInDb)

		a.miniblocksProcessed.Add(uint64(len(serialized)))
	}
	return nil
}

func (a *Archiver) Start(ctx context.Context, once bool, exitSignal chan<- error) {
	defer a.startedWG.Done()
	err := a.startImpl(ctx, once)
	if err != nil {
		exitSignal <- err
	}
}

func (a *Archiver) startImpl(ctx context.Context, once bool) error {
	if once {
		a.tasksWG = &sync.WaitGroup{}
	}

	numWorkers := a.config.GetWorkerPoolSize()
	for i := 0; i < numWorkers; i++ {
		a.workersWG.Add(1)
		go a.worker(ctx)
	}

	pageSize := a.config.GetStreamsContractCallPageSize()

	blockNum := a.contract.Blockchain.InitialBlockNum

	callOpts := &bind.CallOpts{
		Context:     ctx,
		BlockNumber: blockNum.AsBigInt(),
	}

	lastPage := false
	var err error
	var streams []contracts.StreamWithId
	for i := int64(0); !lastPage; i += pageSize {
		streams, lastPage, err = a.contract.StreamRegistry.GetPaginatedStreams(
			callOpts,
			big.NewInt(i),
			big.NewInt(i+pageSize),
		)
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
			if a.tasksWG != nil {
				a.tasksWG.Add(1)
			}
			a.addNewStream(ctx, stream.Id, &stream.Stream.Nodes, stream.Stream.LastMiniblockNum)
		}
	}

	if !once {
		err = a.contract.OnStreamEvent(
			ctx,
			blockNum+1,
			a.onStreamAllocated,
			a.onStreamLastMiniblockUpdated,
			a.onStreamPlacementUpdated,
		)
		if err != nil {
			return err
		}

		go a.printStats(ctx)
	}

	return nil
}

func (a *Archiver) onStreamAllocated(ctx context.Context, event *contracts.StreamRegistryV1StreamAllocated) {
	a.newStreamAllocated.Add(1)
	id := StreamId(event.StreamId)
	a.addNewStream(ctx, id, &event.Nodes, 0)
	a.tasks <- id
}

func (a *Archiver) onStreamPlacementUpdated(
	ctx context.Context,
	event *contracts.StreamRegistryV1StreamPlacementUpdated,
) {
	a.streamPlacementUpdated.Add(1)

	id := StreamId(event.StreamId)
	record, loaded := a.streams.Load(id)
	if !loaded {
		dlog.FromCtx(ctx).Error("onStreamPlacementUpdated: Stream not found in map", "streamId", id)
		return
	}
	stream := record.(*ArchiveStream)
	_ = stream.nodes.Update(event.NodeAddress, event.IsAdded)
}

func (a *Archiver) onStreamLastMiniblockUpdated(
	ctx context.Context,
	event *contracts.StreamRegistryV1StreamLastMiniblockUpdated,
) {
	a.streamLastMiniblockUpdated.Add(1)

	id := StreamId(event.StreamId)
	record, loaded := a.streams.Load(id)
	if !loaded {
		dlog.FromCtx(ctx).Error("onStreamLastMiniblockUpdated: Stream not found in map", "streamId", id)
		return
	}
	stream := record.(*ArchiveStream)
	stream.numBlocksInContract.Store(int64(event.LastMiniblockNum + 1))
	a.tasks <- id
}

func (a *Archiver) WaitForWorkers() {
	a.workersWG.Wait()
}

// Waiting for tasks is only possible if archiver is started in "once" mode.
func (a *Archiver) WaitForTasks() {
	a.tasksWG.Wait()
}

func (a *Archiver) WaitForStart() {
	a.startedWG.Wait()
}

func (a *Archiver) GetStats() *ArchiverStats {
	return &ArchiverStats{
		StreamsExamined:            a.streamsExamined.Load(),
		StreamsCreated:             a.streamsCreated.Load(),
		StreamsUpToDate:            a.streamsUpToDate.Load(),
		SuccessOpsCount:            a.successOpsCount.Load(),
		FailedOpsCount:             a.failedOpsCount.Load(),
		MiniblocksProcessed:        a.miniblocksProcessed.Load(),
		NewStreamAllocated:         a.newStreamAllocated.Load(),
		StreamPlacementUpdated:     a.streamPlacementUpdated.Load(),
		StreamLastMiniblockUpdated: a.streamLastMiniblockUpdated.Load(),
	}
}

func (a *Archiver) worker(ctx context.Context) {
	log := dlog.FromCtx(ctx)

	defer a.workersWG.Done()

	for {
		select {
		case <-ctx.Done():
			return
		case streamId := <-a.tasks:
			record, loaded := a.streams.Load(streamId)
			if !loaded {
				log.Error("archiver.worker: Stream not found in map", "streamId", streamId)
				continue
			}
			err := a.ArchiveStream(ctx, record.(*ArchiveStream))
			if err != nil {
				log.Error("archiver.worker: Failed to archive stream", "error", err, "streamId", streamId)
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

func (a *Archiver) printStats(ctx context.Context) {
	log := dlog.FromCtx(ctx)
	period := a.config.GetPrintStatsPeriod()
	if period <= 0 {
		return
	}
	ticker := time.NewTicker(period)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			log.Info("Archiver stats", "stats", a.GetStats())
		}
	}
}
