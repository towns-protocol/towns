package events

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/gammazero/workerpool"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
)

type StreamSyncTasksProcessor struct {
	pendingTasks sync.Map
	workerPool   *workerpool.WorkerPool
}

type StreamSyncTaskProcessorParams struct {
	WorkerPoolSize int
}

// NewStreamSyncTasksProcessor creates a new sync task process that schedules and processes sync stream requests.
func NewStreamSyncTasksProcessor(
	ctx context.Context,
	params *StreamSyncTaskProcessorParams,
) (*StreamSyncTasksProcessor, error) {
	log := dlog.FromCtx(ctx).With("function", "NewStreamSyncTasksProcessor")
	log.Debug("Starting StreamSyncTasksProcessor with workers", "workerPoolSize", params.WorkerPoolSize)
	proc := &StreamSyncTasksProcessor{
		workerPool: workerpool.New(params.WorkerPoolSize),
	}

	return proc, nil
}

// Submit schedules a stream sync task if there is not already one for the given stream.
// This can block when the worker pool is overloaded and returns an indication if the sync task was scheduled.
// False indicates that there was already stream sync task for the given stream scheduled or in progress.
func (sst *StreamSyncTasksProcessor) Submit(
	ctx context.Context,
	stream *registries.GetStreamResult,
	cache *streamCacheImpl,
) bool {
	task := &streamSyncTask{ctx: ctx, stream: stream, cache: cache}

	_, alreadyScheduled := sst.pendingTasks.LoadOrStore(stream.StreamId, task)
	if !alreadyScheduled {
		sst.workerPool.Submit(func() {
			sst.pendingTasks.Delete(task.stream)
			task.process()
		})
	}

	return !alreadyScheduled
}

type streamSyncTask struct {
	ctx    context.Context
	stream *registries.GetStreamResult
	cache  *streamCacheImpl
}

func (task *streamSyncTask) process() {
	var (
		start = time.Now()
		ctx   = task.ctx
		log   = dlog.FromCtx(ctx)
	)

	lastBlockInDB, err := task.lastBlockInDB()
	if err != nil {
		log.Error("Unable to get last mini block in DB", "stream", task.stream.StreamId)
		return
	}

	var (
		syncFromBlock = lastBlockInDB + 1
		syncToBlock   = int64(task.stream.LastMiniblockNum) + 1
	)

	if syncFromBlock == syncToBlock {
		return // nothing to sync
	}

	log.Debug("Start stream sync task", "stream", task.stream.StreamId,
		"fromBlock", syncFromBlock, "toBlock", syncToBlock)

	if err := task.syncStreamsFromPeers(syncFromBlock, syncToBlock); err != nil {
		log.Error("Unable to sync streams from peers", "stream", task.stream.StreamId)
		return
	}

	log.Debug("Stream sync task finished", "stream", task.stream.StreamId,
		"fromBlock", syncFromBlock, "toBlock", syncToBlock, "took", time.Since(start))
}

func (task *streamSyncTask) lastBlockInDB() (int64, error) {
	var (
		lastMiniBlockInDB, err = task.cache.params.Storage.StreamLastMiniBlock(task.ctx, task.stream.StreamId)
		riverErr               *RiverErrorImpl
	)

	if err == nil {
		return lastMiniBlockInDB.Number, nil
	} else if errors.As(err, &riverErr) && riverErr.Code == Err_NOT_FOUND {
		return -1, nil
	}

	return 0, err
}

// syncStreamsFromPeers syncs the database for the given streamResult by fetching missing blocks from peers
// participating in the stream.
func (task *streamSyncTask) syncStreamsFromPeers(
	fromMiniBlockNum int64, // inclusive
	toMiniBlockNum int64, // exclusive
) error {
	var (
		log = dlog.FromCtx(task.ctx)
		ctx = task.ctx
	)

	stream, err := task.cache.getStreamImpl(ctx, task.stream.StreamId)
	if err != nil {
		return err
	}

	streamNodes := nodes.NewStreamNodes(task.stream.Nodes, task.cache.params.Wallet.Address)

	// retrieve mini-blocks from peers and import them, create the stream if needed
	for _, peer := range streamNodes.GetRemotes() {
		miniBlocksStreamOrErr := task.cache.params.RemoteMiniblockProvider.GetMbsStreamed(
			ctx, peer, task.stream.StreamId, fromMiniBlockNum, toMiniBlockNum)

		var (
			from           = fromMiniBlockNum
			blocksToImport []*MiniblockInfo
		)

		for miniBlockOrErr := range miniBlocksStreamOrErr {
			if miniBlockOrErr.Err != nil {
				return miniBlockOrErr.Err
			}

			miniBlockInfo, err := NewMiniblockInfoFromProto(miniBlockOrErr.Miniblock, NewMiniblockInfoFromProtoOpts{
				ExpectedBlockNumber: from,
			})
			if err != nil {
				return err
			}

			blocksToImport = append(blocksToImport, miniBlockInfo)

			from++
		}

		err = stream.importMiniblocks(ctx, blocksToImport)
		if err == nil {
			return nil
		}

		log.Debug("Unable to retrieve miniblocks from peer for stream reconcilation",
			"stream", task.stream.StreamId, "peer", peer, "err", err)
	}

	return RiverError(Err_UNAVAILABLE, "No peer could provide miniblocks for stream reconciliation",
		"stream", task.stream.StreamId)
}
