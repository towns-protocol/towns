package events

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
)

type cacheTestContext struct {
	testParams   testParams
	t            *testing.T
	ctx          context.Context
	require      *require.Assertions
	btc          *crypto.BlockchainTestContext
	clientWallet *crypto.Wallet

	instances       []*cacheTestInstance
	instancesByAddr map[common.Address]*cacheTestInstance
}

var _ RemoteMiniblockProvider = (*cacheTestContext)(nil)

type cacheTestInstance struct {
	params         *StreamCacheParams
	streamRegistry StreamRegistry
	cache          *StreamCache
}

type testParams struct {
	replFactor                    int
	mediaMaxChunkCount            int
	mediaMaxChunkSize             int
	recencyConstraintsGenerations int
	recencyConstraintsAgeSec      int
	defaultMinEventsPerSnapshot   int
	enableNewSnapshotFormat       int

	disableMineOnTx             bool
	numInstances                int
	disableStreamCacheCallbacks bool
}

type noopScrubber struct{}

var _ Scrubber = (*noopScrubber)(nil)

func (n *noopScrubber) Scrub(streamId StreamId) bool { return false }

// makeCacheTestContext creates a test context with a blockchain and a stream registry for stream cache tests.
// It doesn't create a stream cache itself. Call initCache to create a stream cache.
func makeCacheTestContext(t *testing.T, p testParams) (context.Context, *cacheTestContext) {
	t.Parallel()

	if p.numInstances <= 0 {
		p.numInstances = 1
	}

	ctx := test.NewTestContext(t)

	ctc := &cacheTestContext{
		testParams:      p,
		t:               t,
		ctx:             ctx,
		require:         require.New(t),
		instancesByAddr: make(map[common.Address]*cacheTestInstance),
	}

	clientWallet, err := crypto.NewWallet(ctx)
	ctc.require.NoError(err)
	ctc.clientWallet = clientWallet

	btc, err := crypto.NewBlockchainTestContext(
		ctx,
		crypto.TestParams{NumKeys: p.numInstances, MineOnTx: !p.disableMineOnTx, AutoMine: true},
	)
	ctc.require.NoError(err)
	ctc.btc = btc
	t.Cleanup(btc.Close)

	setOnChainStreamConfig(t, ctx, btc, p)

	// register nodes as operational
	baseCtx := ctx
	for i := range p.numInstances {
		log := logging.FromCtx(baseCtx)
		log = log.With("instance", i)
		ctx = logging.CtxWithLog(baseCtx, log)

		ctc.require.NoError(btc.InitNodeRecord(ctx, i, "fakeurl"))
	}

	// load instances
	for i := range p.numInstances {
		log := logging.FromCtx(baseCtx)
		log = log.With("instance", i)
		ctx = logging.CtxWithLog(baseCtx, log)

		bc := btc.GetBlockchain(ctx, i)

		streamStore := storage.NewTestStreamStore(ctx)
		t.Cleanup(streamStore.Close)

		cfg := btc.RegistryConfig()
		registry, err := registries.NewRiverRegistryContract(
			ctx,
			bc,
			&cfg,
			&config.GetDefaultConfig().RiverRegistry,
		)
		ctc.require.NoError(err)

		blockNumber := btc.BlockNum(ctx)

		nr, err := LoadNodeRegistry(
			ctx,
			registry,
			bc.Wallet.Address,
			blockNumber,
			bc.ChainMonitor,
			btc.OnChainConfig,
			nil,
			nil,
			nil,
		)
		ctc.require.NoError(err)

		params := &StreamCacheParams{
			ServerCtx:               ctx,
			Storage:                 streamStore.Storage,
			Wallet:                  bc.Wallet,
			RiverChain:              bc,
			Registry:                registry,
			ChainConfig:             btc.OnChainConfig,
			Config:                  config.GetDefaultConfig(),
			AppliedBlockNum:         blockNumber,
			ChainMonitor:            bc.ChainMonitor,
			Metrics:                 infra.NewMetricsFactory(nil, "", ""),
			RemoteMiniblockProvider: ctc,
			Scrubber:                &noopScrubber{},
			NodeRegistry:            nr,
			disableCallbacks:        p.disableStreamCacheCallbacks,
		}

		inst := &cacheTestInstance{
			params:         params,
			streamRegistry: NewStreamRegistry(bc, nr, registry, btc.OnChainConfig),
		}
		ctc.instances = append(ctc.instances, inst)
		ctc.instancesByAddr[bc.Wallet.Address] = inst
	}

	return baseCtx, ctc
}

func (ctc *cacheTestContext) initCache(n int, opts *MiniblockProducerOpts) *StreamCache {
	streamCache := NewStreamCache(ctc.instances[n].params)
	err := streamCache.Start(ctc.ctx, opts)
	ctc.require.NoError(err)
	ctc.instances[n].cache = streamCache
	return streamCache
}

func (ctc *cacheTestContext) initAllCaches(opts *MiniblockProducerOpts) {
	for i := range ctc.instances {
		_ = ctc.initCache(i, opts)
	}
}

func (ctc *cacheTestContext) createReplStream() (StreamId, []common.Address, *MiniblockRef) {
	streamId := testutils.FakeStreamId(STREAM_USER_SETTINGS_BIN)
	mb := MakeGenesisMiniblockForUserSettingsStream(ctc.t, ctc.clientWallet, ctc.instances[0].params.Wallet, streamId)
	storageMb, err := mb.AsStorageMb()
	ctc.require.NoError(err)

	nodes, err := ctc.instances[0].streamRegistry.AllocateStream(
		ctc.ctx,
		streamId,
		common.BytesToHash(mb.Proto.Header.Hash),
		storageMb.Data,
	)
	ctc.require.NoError(err)
	ctc.require.Len(nodes, ctc.testParams.replFactor)

	for _, n := range nodes {
		var s *Stream
		var err error
		for {
			s, err = ctc.instancesByAddr[n].cache.GetStreamWaitForLocal(ctc.ctx, streamId)
			if !IsRiverErrorCode(err, Err_NOT_FOUND) {
				break
			}
			time.Sleep(10 * time.Millisecond)
		}
		ctc.require.NoError(err)
		_, err = s.GetView(ctc.ctx)
		ctc.require.NoError(err)
	}

	return streamId, nodes, &MiniblockRef{Hash: common.Hash(mb.Proto.Header.Hash), Num: 0}
}

func (ctc *cacheTestContext) addReplEvent(
	streamId StreamId,
	prevMiniblock *MiniblockRef,
	nodes []common.Address,
) {
	addr := crypto.GetTestAddress()
	ev, err := MakeParsedEventWithPayload(
		ctc.clientWallet,
		Make_UserSettingsPayload_UserBlock(
			&UserSettingsPayload_UserBlock{
				UserId:    addr[:],
				IsBlocked: true,
				EventNum:  22,
			},
		),
		prevMiniblock,
	)
	ctc.require.NoError(err)

	for _, n := range nodes {
		stream, err := ctc.instancesByAddr[n].cache.GetStreamWaitForLocal(ctc.ctx, streamId)
		ctc.require.NoError(err)

		err = stream.AddEvent(ctc.ctx, ev)
		ctc.require.NoError(err)
	}
}

// TODO: rename to allocateStream
func (ctc *cacheTestContext) createStreamNoCache(
	streamId StreamId,
	genesisMiniblock *Miniblock,
) {
	mbBytes, err := proto.Marshal(genesisMiniblock)
	ctc.require.NoError(err)

	_, err = ctc.instances[0].streamRegistry.AllocateStream(
		ctc.ctx,
		streamId,
		common.BytesToHash(genesisMiniblock.Header.Hash),
		mbBytes,
	)
	ctc.require.NoError(err)
}

// TODO: rename to createStreamInstance0
func (ctc *cacheTestContext) createStream(
	streamId StreamId,
	genesisMiniblock *Miniblock,
) (*Stream, *StreamView) {
	ctc.createStreamNoCache(streamId, genesisMiniblock)
	s, err := ctc.instances[0].cache.GetStreamWaitForLocal(ctc.ctx, streamId)
	ctc.require.NoError(err)
	v, err := s.GetView(ctc.ctx)
	ctc.require.NoError(err)
	return s, v
}

func (ctc *cacheTestContext) getBC() *crypto.Blockchain {
	return ctc.instances[0].params.RiverChain
}

func (ctc *cacheTestContext) allocateStreams(count int) map[StreamId]*Miniblock {
	genesisBlocks := make(map[StreamId]*Miniblock)
	var mu sync.Mutex

	var wg sync.WaitGroup
	wg.Add(count)
	for range count {
		go func() {
			defer wg.Done()

			streamID := testutils.FakeStreamId(STREAM_SPACE_BIN)
			mb := MakeGenesisMiniblockForSpaceStream(
				ctc.t,
				ctc.clientWallet,
				ctc.instances[0].params.Wallet,
				streamID,
				nil,
			)
			ctc.createStreamNoCache(streamID, mb.Proto)

			mu.Lock()
			defer mu.Unlock()
			genesisBlocks[streamID] = mb.Proto
		}()
	}
	wg.Wait()
	return genesisBlocks
}

func (ctc *cacheTestContext) makeMiniblock(inst int, streamId StreamId, forceSnapshot bool) *MiniblockRef {
	ref, err := ctc.instances[inst].cache.TestMakeMiniblock(ctc.ctx, streamId, forceSnapshot)
	ctc.require.NoError(err)
	return ref
}

func (ctc *cacheTestContext) GetMbProposal(
	ctx context.Context,
	node common.Address,
	request *ProposeMiniblockRequest,
) (*ProposeMiniblockResponse, error) {
	inst := ctc.instancesByAddr[node]

	stream, err := inst.cache.getStreamImpl(ctx, StreamId(request.StreamId), true)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetView(ctx)
	if err != nil {
		return nil, err
	}

	resp, err := view.ProposeNextMiniblock(ctx, inst.params.ChainConfig.Get(), request)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (ctc *cacheTestContext) SaveMbCandidate(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	candidate *MiniblockInfo,
) error {
	inst := ctc.instancesByAddr[node]

	stream, err := inst.cache.getStreamImpl(ctx, streamId, true)
	if err != nil {
		return err
	}

	return stream.SaveMiniblockCandidate(ctx, candidate)
}

func (ctc *cacheTestContext) GetMbs(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([]*MiniblockInfo, error) {
	for _, instance := range ctc.instances {
		if node == instance.params.Wallet.Address {
			stream, err := instance.cache.getStreamImpl(ctx, streamId, true)
			if err != nil {
				return nil, err
			}

			mbs, _, err := stream.GetMiniblocks(ctx, fromInclusive, toExclusive, false)
			if err != nil {
				return nil, err
			}
			return mbs, nil
		}
	}

	return nil, RiverError(Err_INTERNAL, "TEST: cacheTestContext::GetMbs node not found")
}

func setOnChainStreamConfig(t *testing.T, ctx context.Context, btc *crypto.BlockchainTestContext, p testParams) {
	if p.replFactor != 0 {
		btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamReplicationFactorConfigKey,
			crypto.ABIEncodeUint64(uint64(p.replFactor)),
		)
	}
	if p.mediaMaxChunkCount != 0 {
		btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamMediaMaxChunkCountConfigKey,
			crypto.ABIEncodeUint64(uint64(p.mediaMaxChunkCount)),
		)
	}
	if p.mediaMaxChunkSize != 0 {
		btc.SetConfigValue(
			t,
			ctx,
			crypto.StreamMediaMaxChunkSizeConfigKey,
			crypto.ABIEncodeUint64(uint64(p.mediaMaxChunkSize)),
		)
	}
	if p.recencyConstraintsGenerations != 0 {
		btc.SetConfigValue(t, ctx,
			crypto.StreamRecencyConstraintsGenerationsConfigKey,
			crypto.ABIEncodeUint64(uint64(p.recencyConstraintsGenerations)),
		)
	}
	if p.recencyConstraintsAgeSec != 0 {
		btc.SetConfigValue(t, ctx,
			crypto.StreamRecencyConstraintsAgeSecConfigKey,
			crypto.ABIEncodeUint64(uint64(p.recencyConstraintsAgeSec)),
		)
	}
	if p.defaultMinEventsPerSnapshot != 0 {
		btc.SetConfigValue(t, ctx,
			crypto.StreamDefaultMinEventsPerSnapshotConfigKey,
			crypto.ABIEncodeUint64(uint64(p.defaultMinEventsPerSnapshot)),
		)
	}
	if p.enableNewSnapshotFormat != 0 {
		btc.SetConfigValue(t, ctx,
			crypto.StreamEnableNewSnapshotFormatConfigKey,
			crypto.ABIEncodeUint64(uint64(p.enableNewSnapshotFormat)),
		)
	}
}

func (i *cacheTestInstance) makeAndSaveMbCandidate(
	ctx context.Context,
	stream *Stream,
	blockNum crypto.BlockNumber,
) (*MiniblockInfo, error) {
	j := &mbJob{
		stream: stream,
		cache:  i.cache,
	}
	err := j.produceCandidate(ctx, blockNum)
	if err != nil {
		return nil, err
	}
	return j.candidate, nil
}

func (i *cacheTestInstance) makeMbCandidate(
	ctx context.Context,
	stream *Stream,
) (*MiniblockInfo, error) {
	j := &mbJob{
		stream: stream,
		cache:  i.cache,
	}
	j.quorumNodes, _ = j.stream.GetRemotesAndIsLocal()
	j.replicated = len(j.quorumNodes) > 0
	err := j.makeCandidate(ctx)
	if err != nil {
		return nil, err
	}
	return j.candidate, nil
}

func (i *cacheTestInstance) makeMbCandidateForView(
	ctx context.Context,
	view *StreamView,
) (*MiniblockInfo, error) {
	proposal := view.proposeNextMiniblock(ctx, i.params.ChainConfig.Get(), false)
	mbCandidate, err := view.makeMiniblockCandidate(ctx, i.params, proposal)
	if err != nil {
		return nil, err
	}
	return mbCandidate, nil
}
