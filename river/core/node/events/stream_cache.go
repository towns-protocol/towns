package events

import (
	"context"
	"sync"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/registries"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
)

type StreamCacheParams struct {
	Storage      storage.StreamStorage
	Wallet       *crypto.Wallet
	Riverchain   *crypto.Blockchain
	Registry     *registries.RiverRegistryContract
	StreamConfig *config.StreamConfig
}

type StreamCache interface {
	GetStream(ctx context.Context, streamId StreamId) (SyncStream, StreamView, error)
	CreateStream(ctx context.Context, streamId StreamId) (SyncStream, StreamView, error)
	ForceFlushAll(ctx context.Context)
	GetLoadedViews(ctx context.Context) []StreamView
}

type streamCacheImpl struct {
	params *StreamCacheParams

	// streamId -> *streamImpl
	// cache is populated by getting all streams that should be on local node from River chain.
	// streamImpl can be in unloaded state, in which case it will be loaded on first GetStream call.
	cache sync.Map

	// New miniblock production in triggered when there is new block on River chain.
	onNewBlockMutex sync.Mutex
}

var _ StreamCache = (*streamCacheImpl)(nil)

func NewStreamCache(ctx context.Context, params *StreamCacheParams) (*streamCacheImpl, error) {
	s := &streamCacheImpl{
		params: params,
	}

	blockNum, err := params.Registry.Blockchain.Client.BlockNumber(ctx)
	if err != nil {
		return nil, err
	}

	streams, err := params.Registry.GetAllStreams(ctx, blockNum)
	if err != nil {
		return nil, err
	}

	// TODO: read stream state from storage and schedule required reconciliations.

	for _, stream := range streams {
		nodes := NewStreamNodes(stream.Nodes, params.Wallet.Address)
		if nodes.IsLocal() {
			s.cache.Store(stream.StreamId, &streamImpl{
				params:   params,
				streamId: stream.StreamId,
				nodes:    nodes,
			})
		}
	}

	// TODO: setup monitor for stream updates and update records accordingly.

	c := crypto.MakeBlockNumberChannel()
	params.Riverchain.BlockMonitor.AddListener(c)
	go s.newBlockReader(ctx, c)
	return s, nil
}

func (s *streamCacheImpl) tryLoadStreamRecord(ctx context.Context, streamId StreamId) (SyncStream, StreamView, error) {
	// Same code is called for GetStream and CreateStream.
	// For GetStream the fact that record is not in cache means that there is race to get it during creation:
	// Blockchain record is already created, but this fact is not reflected yet in local storage.
	// This may happen if somebody observes record allocation on blockchain and tries to get stream
	// while local storage is being initialized.
	record, _, mb, err := s.params.Registry.GetStreamWithGenesis(ctx, streamId)
	if err != nil {
		return nil, nil, err
	}

	nodes := NewStreamNodes(record.Nodes, s.params.Wallet.Address)
	if !nodes.IsLocal() {
		return nil, nil, RiverError(
			Err_INTERNAL,
			"Stream is not local",
			"streamId", streamId,
			"nodes", record.Nodes,
			"localNode", s.params.Wallet.AddressStr,
		)
	}

	if record.LastMiniblockNum > 0 {
		// TODO: reconcile from other nodes.
		return nil, nil, RiverError(Err_INTERNAL, "Stream is past genesis", "streamId", streamId)
	}

	stream := &streamImpl{
		params:   s.params,
		streamId: streamId,
		nodes:    nodes,
	}

	// Lock stream, so parallel creators have to wait for the stream to be intialized.
	stream.mu.Lock()
	defer stream.mu.Unlock()

	entry, loaded := s.cache.LoadOrStore(streamId, stream)
	if !loaded {
		// Our stream won the race, put into storage.
		err := s.params.Storage.CreateStreamStorage(ctx, streamId, mb)
		if err != nil {
			if AsRiverError(err).Code == Err_ALREADY_EXISTS {
				// Attempt to load stream from storage. Might as well do it while under lock.
				err = stream.loadInternal(ctx)
				if err == nil {
					return stream, stream.view, nil
				}
			}
			return nil, nil, err
		}

		// Successfully put data into storage, init stream view.
		view, err := MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
			StartMiniblockNumber: 0,
			Miniblocks:           [][]byte{mb},
		})
		if err != nil {
			return nil, nil, err
		}
		stream.view = view
		return stream, view, nil
	} else {
		// There was another record in the cache, use it.
		if entry == nil {
			return nil, nil, RiverError(Err_INTERNAL, "Cache corruption", "streamId", streamId)
		}
		stream = entry.(*streamImpl)
		view, err := stream.GetView(ctx)
		if err != nil {
			return nil, nil, err
		}
		return stream, view, nil
	}
}

func (s *streamCacheImpl) GetStream(ctx context.Context, streamId StreamId) (SyncStream, StreamView, error) {
	entry, _ := s.cache.Load(streamId)
	if entry == nil {
		return s.tryLoadStreamRecord(ctx, streamId)
	}
	stream := entry.(*streamImpl)

	streamView, err := stream.GetView(ctx)

	if err == nil {
		return stream, streamView, nil
	} else {
		// TODO: if stream is not present in local storage, schedule reconciliation.
		return nil, nil, err
	}
}

func (s *streamCacheImpl) CreateStream(
	ctx context.Context,
	streamId StreamId,
) (SyncStream, StreamView, error) {
	// Same logic as in GetStream: read from blockchain, create if present.
	return s.GetStream(ctx, streamId)
}

func (s *streamCacheImpl) ForceFlushAll(ctx context.Context) {
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)
		stream.ForceFlush(ctx)
		return true
	})
}

func (s *streamCacheImpl) GetLoadedViews(ctx context.Context) []StreamView {
	var result []StreamView
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)
		view := stream.tryGetView()
		if view != nil {
			result = append(result, view)
		}
		return true
	})
	return result
}

func (s *streamCacheImpl) onNewBlock(ctx context.Context) {
	log := dlog.FromCtx(ctx)
	// Log at level below debug, otherwise it's too chatty.
	log.Log(ctx, -8, "onNewBlock: ENTER producing new miniblocks")

	// Try lock to have only one invocation at a time. Previous onNewBlock may still be running.
	if !s.onNewBlockMutex.TryLock() {
		return
	}
	defer s.onNewBlockMutex.Unlock()

	var total, errors, produced int
	s.cache.Range(func(key, value interface{}) bool {
		stream := value.(*streamImpl)

		if stream.mbCreationEnabled() {
			// TODO: replace with vote
			// For now: only first assigned node produces blocks.
			if stream.nodes.LocalAndFirst() {
				total++
				// Nothing to do on error, MakeMiniblock logs on error level if there is an error.
				ok, err := stream.MakeMiniblock(ctx, false)
				if err != nil {
					errors++
				} else if ok {
					produced++
				}
			}
		}
		return true
	})

	// Log at level below debug, otherwise it's too chatty.
	log.Log(ctx, -8, "onNewBlock: EXIT produced new miniblocks", "total", total, "errors", errors, "produced", produced)
}

func (s *streamCacheImpl) newBlockReader(ctx context.Context, c crypto.BlockNumberChannel) {
	for {
		select {
		case _, ok := <-c:
			if !ok {
				return
			}
			go s.onNewBlock(ctx)
		case <-ctx.Done():
			return
		}
	}
}
