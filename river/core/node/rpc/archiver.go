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
	"github.com/prometheus/client_golang/prometheus"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
)

// nodeUpdateGracePeriod describes the maximum delay we would expect to see
// when a stream's miniblocks updates in the registry before we consider a
// node behind of it does not have the latest miniblock.
// Two blocks plus change
var nodeUpdateGracePeriod = 5 * time.Second

type contractState struct {
	// Everything in the registry state is protected by this mutex.
	mu                  sync.Mutex
	numBlocksInContract int64
	// This is the last time we saw an event to update the miniblock count for the
	// stream. lastContractMiniblockUpdate should always be updated with numBlocksInContract.
	lastContractMiniblockUpdate time.Time
}

func (cs *contractState) UpdateNumBlocksInContract(blocks int64) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	cs.numBlocksInContract = blocks
	cs.lastContractMiniblockUpdate = time.Now()
}

func (cs *contractState) NumBlocksInContract() (int64, time.Time) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	return cs.numBlocksInContract, cs.lastContractMiniblockUpdate
}

type ArchiveStream struct {
	streamId StreamId
	nodes    nodes.StreamNodes

	// registryState describes the state of the stream as reported by the stream
	// registry.
	registryState contractState
	numBlocksInDb atomic.Int64 // -1 means not loaded

	stale atomic.Bool

	// Mutex is used so only one archive operation is performed at a time.
	mu sync.Mutex
}

func NewArchiveStream(streamId StreamId, nn *[]common.Address, lastKnownMiniblock uint64) *ArchiveStream {
	stream := &ArchiveStream{
		streamId: streamId,
		nodes:    nodes.NewStreamNodesWithLock(*nn, common.Address{}),
	}
	stream.registryState.UpdateNumBlocksInContract(int64(lastKnownMiniblock + 1))
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

	// Statistics
	streamsExamined            atomic.Uint64
	streamsCreated             atomic.Uint64
	streamsUpToDate            atomic.Uint64
	successOpsCount            atomic.Uint64
	failedOpsCount             atomic.Uint64
	miniblocksProcessed        atomic.Uint64
	newStreamAllocated         atomic.Uint64
	streamPlacementUpdated     atomic.Uint64
	streamLastMiniblockUpdated atomic.Uint64

	// metrics
	nodeBehindEvents *prometheus.CounterVec
	nodeAdvances     *prometheus.CounterVec
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

func (a *Archiver) setupStatisticsMetrics(factory infra.MetricsFactory) {
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_streams_examined",
			Help: "Total streams monitored by the archiver",
		},
		func() float64 { return float64(a.streamsExamined.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_streams_created",
			Help: "Total streams allocated on disk by the archiver since the last boot",
		},
		func() float64 { return float64(a.streamsCreated.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_streams_up_to_date",
			Help: "Total ArchiveStream executions that did not see stream updates",
		},
		func() float64 { return float64(a.streamsUpToDate.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_success_ops_count",
			Help: "Total successful ArchiveStream executions",
		},
		func() float64 { return float64(a.successOpsCount.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_failed_ops_count",
			Help: "Total failed ArchiveStream executions",
		},
		func() float64 { return float64(a.failedOpsCount.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_miniblocks_processed",
			Help: "Total miniblocks downloaded and stored since the last boot",
		},
		func() float64 { return float64(a.miniblocksProcessed.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_new_stream_allocated",
			Help: "Total streams allocated in response to detected stream allocation events",
		},
		func() float64 { return float64(a.newStreamAllocated.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_stream_placement_updated",
			Help: "Total stream placement changes",
		},
		func() float64 { return float64(a.streamPlacementUpdated.Load()) },
	)
	factory.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stats_stream_last_miniblock_updated",
			Help: "Total miniblock update events",
		},
		func() float64 { return float64(a.streamLastMiniblockUpdated.Load()) },
	)

	a.nodeBehindEvents = factory.NewCounterVecEx(
		"node_behind_events",
		"Total times a node was considered to have an out of date stream record",
		"node_address",
	)

	a.nodeAdvances = factory.NewCounterVecEx(
		"node_advances",
		"Total times a node was advanced, indicating it was behind or returned an error response",
		"node_address",
	)
}

func (a *Archiver) addNewStream(
	ctx context.Context,
	streamId StreamId,
	nn *[]common.Address,
	lastKnownMiniblock uint64,
) {
	_, loaded := a.streams.LoadOrStore(streamId, NewArchiveStream(streamId, nn, lastKnownMiniblock))
	if loaded {
		// TODO: Double notification, shouldn't happen.
		dlog.FromCtx(ctx).
			Error("Stream already exists in archiver map", "streamId", streamId, "lastKnownMiniblock", lastKnownMiniblock)
		return
	}

	a.tasks <- streamId

	a.streamsExamined.Add(1)
}

func (a *Archiver) onNodeBehind(
	stream *ArchiveStream,
	nodeAddr common.Address,
) {
	// Mark the stream as stale and advance the node pointer.
	stream.stale.Store(true)
	// We now consider this node behind for this stream. Let's advance it.
	if a.nodeAdvances != nil {
		nodeAddress := prometheus.Labels{"node_address": nodeAddr.String()}
		a.nodeAdvances.With(nodeAddress).Inc()
		a.nodeBehindEvents.With(nodeAddress).Inc()
	}
	stream.nodes.AdvanceStickyPeer(nodeAddr)
}

// ArchiveStream attempts to add all new miniblocks seen, according to the registry contract,
// since the last time the stream was archived into storage.  It creates a new stream for
// streams that have not yet been seen.
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

	mbsInContract, contractMbsUpdated := stream.registryState.NumBlocksInContract()
	if mbsInDb >= mbsInContract {
		a.streamsUpToDate.Add(1)
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
		if err != nil && AsRiverError(err).Code != Err_NOT_FOUND {
			log.Warn(
				"Error when calling GetMiniblocks on server",
				"error",
				err,
				"streamId",
				stream.streamId,
			)
			if a.nodeAdvances != nil {
				a.nodeAdvances.With(prometheus.Labels{"node_address": nodeAddr.String()}).Inc()
			}
			stream.nodes.AdvanceStickyPeer(nodeAddr)
			return err
		}

		if (err != nil && AsRiverError(err).Code == Err_NOT_FOUND) || resp.Msg == nil || len(resp.Msg.Miniblocks) == 0 {
			if time.Since(contractMbsUpdated) > nodeUpdateGracePeriod {
				a.onNodeBehind(
					stream,
					nodeAddr,
				)
			} else {
				log.Debug(
					"ArchiveStream: GetMiniblocks did not return data, remote storage is not up-to-date with contract yet",
					"streamId",
					stream.streamId,
					"fromInclusive",
					mbsInDb,
					"toExclusive",
					toBlock,
				)
			}

			// Reschedule with delay.
			streamId := stream.streamId
			time.AfterFunc(time.Second, func() {
				a.tasks <- streamId
			})
			return nil
		}

		msg := resp.Msg

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

	// All blocks processed, mark stream as current
	stream.stale.Store(false)

	return nil
}

func (a *Archiver) Start(ctx context.Context, once bool, metrics infra.MetricsFactory, exitSignal chan<- error) {
	defer a.startedWG.Done()
	err := a.startImpl(ctx, once, metrics)
	if err != nil {
		exitSignal <- err
	}
}

func (a *Archiver) startImpl(ctx context.Context, once bool, metrics infra.MetricsFactory) error {
	if once {
		a.tasksWG = &sync.WaitGroup{}
	} else if metrics != nil {
		a.setupStatisticsMetrics(metrics)
	}

	numWorkers := a.config.GetWorkerPoolSize()
	for i := 0; i < numWorkers; i++ {
		a.workersWG.Add(1)
		go a.worker(ctx)
	}

	pageSize := a.config.GetStreamsContractCallPageSize()

	blockNum := a.contract.Blockchain.InitialBlockNum

	log := dlog.FromCtx(ctx)
	log.Info("Reading stream registry for contract state of streams", "blockNum", blockNum, "pageSize", pageSize)

	callOpts := &bind.CallOpts{
		Context:     ctx,
		BlockNumber: blockNum.AsBigInt(),
	}

	lastPage := false
	var err error
	var streams []river.StreamWithId
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
			log := dlog.FromCtx(ctx)
			log.Debug("Adding stream via detecting presence in stream registry", "streamId", stream.Id)
			a.addNewStream(ctx, stream.Id, &stream.Stream.Nodes, stream.Stream.LastMiniblockNum)
		}
		if lastPage {
			log.Info(
				"Iterated through all contract streams",
				"pageSize",
				pageSize,
				"numStreams",
				i+int64(len(streams)),
				"blockNum",
				blockNum,
			)
		}
	}

	if !once {
		log.Info("Listening to stream events", "blockNum", blockNum+1)
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
	}

	return nil
}

func (a *Archiver) onStreamAllocated(ctx context.Context, event *river.StreamRegistryV1StreamAllocated) {
	a.newStreamAllocated.Add(1)
	id := StreamId(event.StreamId)
	a.addNewStream(ctx, id, &event.Nodes, 0)
	a.tasks <- id
}

func (a *Archiver) onStreamPlacementUpdated(
	ctx context.Context,
	event *river.StreamRegistryV1StreamPlacementUpdated,
) {
	a.streamPlacementUpdated.Add(1)

	id := StreamId(event.StreamId)
	record, loaded := a.streams.Load(id)
	if !loaded {
		dlog.FromCtx(ctx).Error("onStreamPlacementUpdated: Stream not found in map", "streamId", id)
		return
	}
	stream := record.(*ArchiveStream)
	_ = stream.nodes.Update(event, common.Address{})
}

func (a *Archiver) onStreamLastMiniblockUpdated(
	ctx context.Context,
	event *river.StreamRegistryV1StreamLastMiniblockUpdated,
) {
	a.streamLastMiniblockUpdated.Add(1)

	id := StreamId(event.StreamId)
	record, loaded := a.streams.Load(id)
	if !loaded {
		dlog.FromCtx(ctx).Error("onStreamLastMiniblockUpdated: Stream not found in map", "streamId", id)
		return
	}
	stream := record.(*ArchiveStream)
	stream.registryState.UpdateNumBlocksInContract(int64(event.LastMiniblockNum + 1))
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
