package events

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes/streamplacement"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
	"github.com/towns-protocol/towns/core/node/testutils/testrpcstream"
	"github.com/towns-protocol/towns/core/node/utils/rpcinterface"
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

var _ RemoteProvider = (*cacheTestContext)(nil)

type cacheTestInstance struct {
	params       *StreamCacheParams
	streamPlacer streamplacement.Distributor
	cache        *StreamCache
}

type testParams struct {
	replFactor                       int
	mediaMaxChunkCount               int
	mediaMaxChunkSize                int
	recencyConstraintsGenerations    int
	recencyConstraintsAgeSec         int
	defaultMinEventsPerSnapshot      int
	backwardsReconciliationThreshold *uint64
	streamHistoryDefaultMiniblocks   *uint64
	streamHistoryMiniblocks          map[byte]uint64
	streamSnapshotIntervalInMbs      *uint64
	streamTrimActivationFactor       *uint64

	disableMineOnTx             bool
	numInstances                int
	disableStreamCacheCallbacks bool

	config *config.Config
}

func ptrUint64(v uint64) *uint64 {
	return &v
}

type noopScrubber struct{}

var _ Scrubber = (*noopScrubber)(nil)

func (n *noopScrubber) Scrub(streamId StreamId) bool { return false }

// makeCacheTestContext creates a test context with a blockchain and a stream registry for stream cache tests.
// It doesn't create a stream cache itself. Call initCache to create a stream cache.
func makeCacheTestContext(t *testing.T, p testParams) (context.Context, *cacheTestContext) {
	t.Parallel()
	t.Helper()

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

	if ctc.testParams.config == nil {
		ctc.testParams.config = config.GetDefaultConfig()
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

	ctc.testParams.config.RegistryContract = btc.RegistryConfig()

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

		registry, err := registries.NewRiverRegistryContract(
			ctx,
			bc,
			&ctc.testParams.config.RegistryContract,
			&ctc.testParams.config.RiverRegistry,
		)
		ctc.require.NoError(err)

		blockNumber := btc.BlockNum(ctx)

		params := &StreamCacheParams{
			ServerCtx:               ctx,
			Storage:                 streamStore.Storage,
			Wallet:                  bc.Wallet,
			RiverChain:              bc,
			Registry:                registry,
			ChainConfig:             btc.OnChainConfig,
			Config:                  ctc.testParams.config,
			AppliedBlockNum:         blockNumber,
			ChainMonitor:            bc.ChainMonitor,
			Metrics:                 infra.NewMetricsFactory(nil, "", ""),
			RemoteMiniblockProvider: ctc,
			Scrubber:                &noopScrubber{},
			disableCallbacks:        p.disableStreamCacheCallbacks,
		}

		inst := &cacheTestInstance{
			params:       params,
			streamPlacer: ctc,
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

func (ctc *cacheTestContext) allocateStream() (StreamId, []common.Address, *MiniblockRef) {
	streamId := testutils.FakeStreamId(STREAM_USER_SETTINGS_BIN)
	mb := MakeGenesisMiniblockForUserSettingsStream(ctc.t, ctc.clientWallet, ctc.instances[0].params.Wallet, streamId)
	storageMb, err := mb.AsStorageMb()
	ctc.require.NoError(err)

	inst := ctc.instances[0]
	nodes, err := inst.streamPlacer.ChooseStreamNodes(
		ctc.ctx,
		streamId,
		int(inst.params.ChainConfig.Get().ReplicationFactor),
	)
	ctc.require.NoError(err)
	err = inst.params.Registry.AllocateStream(
		ctc.ctx,
		streamId,
		nodes,
		common.BytesToHash(mb.Proto.Header.Hash),
		storageMb.Data,
	)
	ctc.require.NoError(err)
	ctc.require.Len(nodes, ctc.testParams.replFactor)
	return streamId, nodes, &MiniblockRef{Hash: common.Hash(mb.Proto.Header.Hash), Num: 0}
}

func (ctc *cacheTestContext) createReplStream() (StreamId, []common.Address, *MiniblockRef) {
	streamId, nodes, prevMb := ctc.allocateStream()

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

	return streamId, nodes, prevMb
}

func (ctc *cacheTestContext) addReplEvent(
	streamId StreamId,
	prevMiniblock *MiniblockRef,
	nodes []common.Address,
) *ParsedEvent {
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

	for i, n := range nodes {
		stream, err := ctc.instancesByAddr[n].cache.GetStreamWaitForLocal(ctc.ctx, streamId)
		ctc.require.NoError(err)

		require.EventuallyWithT(ctc.t, func(collect *assert.CollectT) {
			err = stream.AddEvent(ctc.ctx, ev)
			assert.NoError(collect, err)
		}, 3*time.Second, 5*time.Millisecond, "failed to add event to stream, node %d %s", i, n)
	}

	return ev
}

// TODO: rename to allocateStream
func (ctc *cacheTestContext) createStreamNoCache(
	streamId StreamId,
	genesisMiniblock *Miniblock,
) {
	mbBytes, err := proto.Marshal(genesisMiniblock)
	ctc.require.NoError(err)

	inst := ctc.instances[0]
	nodes, err := inst.streamPlacer.ChooseStreamNodes(
		ctc.ctx,
		streamId,
		int(inst.params.ChainConfig.Get().ReplicationFactor),
	)
	ctc.require.NoError(err)
	err = inst.params.Registry.AllocateStream(
		ctc.ctx,
		streamId,
		nodes,
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

// makeMiniblockNoCallbacks is a helper function to make a miniblock when blockchain monitoring is disabled.
// In this case secondary replicas are not going to promote candidates automatically, so manual calls are required.
// It assumes that minipool of the first instance is not empty and miniblock must be created.
func (ctc *cacheTestContext) makeMiniblockNoCallbacks(
	nodes []common.Address,
	streamId StreamId,
	forceSnapshot bool,
) *MiniblockRef {
	inst := ctc.instancesByAddr[nodes[0]]
	stream, err := inst.cache.getStreamImpl(ctc.ctx, streamId, true)
	ctc.require.NoError(err)

	lastNum, err := stream.getLastMiniblockNumSkipLoad(ctc.ctx)
	ctc.require.NoError(err)

	ref, err := inst.cache.TestMakeMiniblock(ctc.ctx, streamId, forceSnapshot)
	ctc.require.NoError(err)
	ctc.require.Equal(lastNum+1, ref.Num, "miniblock number mismatch")

	for _, n := range nodes {
		i := ctc.instancesByAddr[n]
		s, err := i.cache.GetStreamWaitForLocal(ctc.ctx, streamId)
		ctc.require.NoError(err)
		err = s.promoteCandidate(ctc.ctx, ref)
		ctc.require.NoError(err)
	}

	return ref
}

func (ctc *cacheTestContext) getInstanceAndCache(node common.Address) (*cacheTestInstance, *StreamCache, error) {
	inst, ok := ctc.instancesByAddr[node]
	if !ok {
		return nil, nil, RiverError(Err_INTERNAL, "TEST: cacheTestContext::getCache node not found", "node", node)
	}
	if inst.cache == nil {
		return nil, nil, RiverError(
			Err_UNAVAILABLE,
			"TEST: cacheTestContext::getCache cache not initialized",
			"node",
			node,
		)
	}
	return inst, inst.cache, nil
}

func (ctc *cacheTestContext) GetMbProposal(
	ctx context.Context,
	node common.Address,
	request *ProposeMiniblockRequest,
) (*ProposeMiniblockResponse, error) {
	inst, cache, err := ctc.getInstanceAndCache(node)
	if err != nil {
		return nil, err
	}

	stream, err := cache.getStreamImpl(ctx, StreamId(request.StreamId), true)
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
	_, cache, err := ctc.getInstanceAndCache(node)
	if err != nil {
		return err
	}

	stream, err := cache.getStreamImpl(ctx, streamId, true)
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
	_, cache, err := ctc.getInstanceAndCache(node)
	if err != nil {
		return nil, err
	}

	stream, err := cache.getStreamImpl(ctx, streamId, true)
	if err != nil {
		return nil, err
	}

	mbs, _, err := stream.GetMiniblocks(ctx, fromInclusive, toExclusive, false)
	if err != nil {
		return nil, err
	}
	return mbs, nil
}

// GetMiniblocksByIds returns miniblocks by their ids.
func (ctc *cacheTestContext) GetMiniblocksByIds(
	ctx context.Context,
	node common.Address,
	req *GetMiniblocksByIdsRequest,
) (rpcinterface.ServerStreamForClient[GetMiniblockResponse], error) {
	inst, _, err := ctc.getInstanceAndCache(node)
	if err != nil {
		return nil, err
	}

	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, err
	}

	// Convert miniblock IDs to ranges with a max range size of 10
	miniblockRanges := storage.MiniblockIdsToRanges(req.MiniblockIds, 10)
	var data []*GetMiniblockResponse

	for _, mbRange := range miniblockRanges {
		miniblocks, _, err := inst.params.Storage.ReadMiniblocks(
			ctx,
			streamId,
			mbRange.StartInclusive,
			mbRange.EndInclusive+1, // +1 because ReadMiniblocks expects toExclusive
			req.OmitSnapshots,
		)
		if err != nil {
			return nil, err
		}

		for _, mbDesc := range miniblocks {
			var mb Miniblock
			if err = proto.Unmarshal(mbDesc.Data, &mb); err != nil {
				return nil, WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal miniblock")
			}

			var snapshot *Envelope
			if len(mbDesc.Snapshot) > 0 && !req.OmitSnapshots {
				snapshot = &Envelope{}
				if err = proto.Unmarshal(mbDesc.Snapshot, snapshot); err != nil {
					return nil, WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal snapshot")
				}
			}

			data = append(data, &GetMiniblockResponse{
				Num:       mbDesc.Number,
				Miniblock: &mb,
				Snapshot:  snapshot,
			})
		}
	}

	return testrpcstream.NewTestRpcStream(data), nil
}

// GetLastMiniblockHash returns the last miniblock hash and number for the given stream.
func (ctc *cacheTestContext) GetLastMiniblockHash(
	ctx context.Context,
	node common.Address,
	streamId StreamId,
) (*MiniblockRef, error) {
	_, cache, err := ctc.getInstanceAndCache(node)
	if err != nil {
		return nil, err
	}

	stream, err := cache.getStreamImpl(ctx, streamId, true)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetViewIfLocal(ctx)
	if err != nil {
		return nil, err
	}

	return view.LastBlock().Ref, nil
}

func (ctc *cacheTestContext) GetStream(
	ctx context.Context,
	node common.Address,
	request *GetStreamRequest,
) (*GetStreamResponse, error) {
	inst, cache, err := ctc.getInstanceAndCache(node)
	if err != nil {
		return nil, err
	}

	stream, err := cache.getStreamImpl(ctx, StreamId(request.StreamId), true)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetViewIfLocal(ctx)
	if err != nil {
		return nil, err
	}

	var result *StreamAndCookie
	if request.SyncCookie != nil {
		result, err = view.GetStreamSince(ctx, inst.params.Wallet.Address, request.SyncCookie)
		if err != nil {
			return nil, err
		}
	} else {
		result = view.GetResetStreamAndCookieWithPrecedingMiniblocks(inst.params.Wallet.Address, request.NumberOfPrecedingMiniblocks)
	}

	return &GetStreamResponse{Stream: result}, nil
}

func (ctc *cacheTestContext) ChooseStreamNodes(
	ctx context.Context,
	streamId StreamId,
	replFactor int,
) ([]common.Address, error) {
	if replFactor > len(ctc.instances) {
		return nil, RiverError(
			Err_INTERNAL,
			"TEST: cacheTestContext::ChooseStreamNodes replFactor is greater than the number of instances",
			"replFactor",
			replFactor,
		)
	}
	addrs := make([]common.Address, replFactor)
	for i := range replFactor {
		addrs[i] = ctc.instances[i].params.Wallet.Address
	}
	return addrs, nil
}

func (ctc *cacheTestContext) compareStreamStorage(
	nodes []common.Address,
	streamId StreamId,
	fromInclusive int64,
	compareMinipools bool,
) {
	ctc.t.Helper()

	instances := make([]*cacheTestInstance, len(nodes))
	for i, n := range nodes {
		instances[i] = ctc.instancesByAddr[n]
	}

	var first *storage.ReadStreamFromLastSnapshotResult
	for i, inst := range instances {
		result, err := inst.cache.params.Storage.ReadStreamFromLastSnapshot(ctc.ctx, streamId, 0)
		ctc.require.NoError(err, "failed to read stream from last snapshot for node %d %s", i, nodes[i])
		testfmt.Logf(ctc.t, "Stream %s on node %d %s:\n%#v\n", streamId, i, nodes[i], result)
		if !compareMinipools {
			result.MinipoolEnvelopes = nil
		}
		if i == 0 {
			first = result
		} else {
			ctc.require.Equal(first, result, "stream %s is not equal for nodes %d %s and %d %s", streamId, 0, nodes[0], i, nodes[i])
		}
	}

	// Calculate the minimum required starting miniblock based on history window configuration.
	// All nodes must have at least miniblocks from (lastMbNum - historyWindow).
	lastMbNum := first.Miniblocks[len(first.Miniblocks)-1].Number
	historyWindow := instances[0].params.ChainConfig.Get().StreamHistoryMiniblocks.ForType(streamId.Type())
	minRequiredFrom := fromInclusive
	if historyWindow > 0 {
		historyStart := lastMbNum - int64(historyWindow)
		if historyStart > minRequiredFrom {
			minRequiredFrom = historyStart
		}
	}

	// Verify each node has at least the minimum required miniblocks, and find the
	// earliest miniblock that ALL nodes have (to start comparison from there).
	// Nodes may have more history than required, but we compare only what all nodes have.
	actualFromInclusive := fromInclusive
	for i, inst := range instances {
		ranges, err := inst.cache.params.Storage.GetMiniblockNumberRanges(ctc.ctx, streamId)
		ctc.require.NoError(err, "failed to get miniblock ranges for node %d %s", i, nodes[i])
		ctc.require.NotEmpty(ranges, "node %d %s has no miniblocks for stream %s", i, nodes[i], streamId)
		ctc.require.LessOrEqual(
			ranges[0].StartInclusive,
			minRequiredFrom,
			"node %d %s is missing miniblocks: has from %d but expected at least from %d (history window: %d, last mb: %d)",
			i,
			nodes[i],
			ranges[0].StartInclusive,
			minRequiredFrom,
			historyWindow,
			lastMbNum,
		)
		// Track the maximum StartInclusive across all nodes - this is where we start comparison
		if ranges[0].StartInclusive > actualFromInclusive {
			actualFromInclusive = ranges[0].StartInclusive
		}
	}

	toExclusive := first.Miniblocks[0].Number
	for actualFromInclusive < toExclusive {
		var firstMiniblocks []*storage.MiniblockDescriptor
		for i, inst := range instances {
			miniblocks, _, err := inst.cache.params.Storage.ReadMiniblocks(
				ctc.ctx,
				streamId,
				actualFromInclusive,
				toExclusive,
				false,
			)
			ctc.require.NoError(err, "failed to read stream for node %d %s", i, nodes[i])
			if i == 0 {
				firstMiniblocks = miniblocks
			} else {
				ctc.require.Equal(firstMiniblocks, miniblocks, "stream %s miniblocks are not equal for nodes %d %s and %d %s", streamId, 0, nodes[0], i, nodes[i])
				// Note: We don't compare terminus values across nodes because terminus depends on
				// whether the preceding miniblock exists locally, which can differ during reconciliation
			}
		}
		actualFromInclusive += int64(len(firstMiniblocks))
	}
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
	if p.backwardsReconciliationThreshold != nil {
		btc.SetConfigValue(t, ctx,
			crypto.StreamBackwardsReconciliationThresholdConfigKey,
			crypto.ABIEncodeUint64(*p.backwardsReconciliationThreshold),
		)
	}
	if p.streamHistoryDefaultMiniblocks != nil {
		btc.SetConfigValue(t, ctx,
			crypto.StreamDefaultStreamHistoryMiniblocksConfigKey,
			crypto.ABIEncodeUint64(*p.streamHistoryDefaultMiniblocks),
		)
	}
	for streamType, value := range p.streamHistoryMiniblocks {
		var key string
		switch streamType {
		case STREAM_CHANNEL_BIN:
			key = crypto.StreamChannelStreamHistoryMiniblocksConfigKey
		case STREAM_DM_CHANNEL_BIN:
			key = crypto.StreamDMStreamHistoryMiniblocksConfigKey
		case STREAM_GDM_CHANNEL_BIN:
			key = crypto.StreamGDMStreamHistoryMiniblocksConfigKey
		case STREAM_METADATA_BIN:
			key = crypto.StreamMetadataStreamHistoryMiniblocksConfigKey
		case STREAM_SPACE_BIN:
			key = crypto.StreamSpaceStreamHistoryMiniblocksConfigKey
		case STREAM_USER_BIN:
			key = crypto.StreamUserStreamHistoryMiniblocksConfigKey
		case STREAM_USER_METADATA_KEY_BIN:
			key = crypto.StreamUserDeviceStreamHistoryMiniblocksConfigKey
		case STREAM_USER_INBOX_BIN:
			key = crypto.StreamUserInboxStreamHistoryMiniblocksConfigKey
		case STREAM_USER_SETTINGS_BIN:
			key = crypto.StreamUserSettingsStreamHistoryMiniblocksConfigKey
		default:
			t.Fatalf("unsupported stream type for history config: 0x%02x", streamType)
		}
		btc.SetConfigValue(t, ctx, key, crypto.ABIEncodeUint64(value))
	}
	if p.streamSnapshotIntervalInMbs != nil {
		btc.SetConfigValue(t, ctx,
			crypto.StreamSnapshotIntervalInMiniblocksConfigKey,
			crypto.ABIEncodeUint64(*p.streamSnapshotIntervalInMbs),
		)
	}
	if p.streamTrimActivationFactor != nil {
		btc.SetConfigValue(t, ctx,
			crypto.StreamTrimActivationFactorConfigKey,
			crypto.ABIEncodeUint64(*p.streamTrimActivationFactor),
		)
	}
}

func (i *cacheTestInstance) makeAndSaveMbCandidate(
	ctx context.Context,
	stream *Stream,
	blockNum blockchain.BlockNumber,
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
	proposal := view.proposeNextMiniblock(ctx, i.params.ChainConfig.Get(), false, true)
	mbCandidate, err := view.makeMiniblockCandidate(ctx, i.params, proposal)
	if err != nil {
		return nil, err
	}
	return mbCandidate, nil
}
