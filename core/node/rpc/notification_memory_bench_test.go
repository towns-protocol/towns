package rpc

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"runtime"
	"testing"
	"time"
	"unsafe"

	"connectrpc.com/connect"
	"github.com/SherClockHolmes/webpush-go"
	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	payload2 "github.com/sideshow/apns2/payload"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/authentication"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	notificationssync "github.com/towns-protocol/towns/core/node/notifications/sync"
	"github.com/towns-protocol/towns/core/node/notifications/types"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/testcert"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

// newServiceTesterForBenchmark creates a serviceTester for benchmarks (doesn't call t.Parallel())
func newServiceTesterForBenchmark(b *testing.B, opts serviceTesterOpts) *serviceTester {
	// Use unsafe pointer cast to make newServiceTester work with *testing.B
	t := (*testing.T)(unsafe.Pointer(b))

	// We can't use newServiceTester directly because it calls t.Parallel()
	// which conflicts with benchmarks. So we duplicate the essential setup here.

	if opts.numNodes <= 0 {
		panic("numNodes must be greater than 0")
	}
	if opts.replicationFactor <= 0 {
		opts.replicationFactor = 1
	}

	ctx := context.Background()

	st := &serviceTester{
		ctx:     ctx,
		t:       t,
		require: require.New(t),
		dbUrl:   dbtestutils.GetTestDbUrl(),
		nodes:   make([]*testNodeRecord, opts.numNodes),
		opts:    opts,
	}

	btcParams := opts.btcParams
	if btcParams == nil {
		btcParams = &crypto.TestParams{
			NumKeys:      opts.numNodes,
			MineOnTx:     true,
			AutoMine:     true,
			NumOperators: opts.numOperators,
		}
	} else if btcParams.NumKeys == 0 {
		btcParams.NumKeys = opts.numNodes
		btcParams.NumOperators = opts.numOperators
	}

	btc, err := crypto.NewBlockchainTestContext(st.ctx, *btcParams)
	st.require.NoError(err)
	st.btc = btc

	for i := 0; i < opts.numNodes; i++ {
		st.nodes[i] = &testNodeRecord{}
		st.nodes[i].listener, st.nodes[i].url = st.makeTestListener()
	}

	st.startAutoMining()

	st.btc.SetConfigValue(
		t,
		ctx,
		crypto.StreamReplicationFactorConfigKey,
		crypto.ABIEncodeUint64(uint64(opts.replicationFactor)),
	)
	st.btc.SetConfigValue(t, ctx, crypto.ServerEnableNode2NodeAuthConfigKey, crypto.ABIEncodeUint64(1))

	if opts.start {
		st.initNodeRecords(0, opts.numNodes, river.NodeStatus_Operational)
		st.startNodes(0, opts.numNodes)
	}

	return st
}

// BenchmarkNotificationStreamViews compares memory usage of OLD vs NEW notification stream view implementations
func BenchmarkNotificationStreamViews(b *testing.B) {
	testCases := []struct {
		memberCount int
	}{
		{10},
		{100},
		{1000},
	}

	for _, tc := range testCases {
		// Benchmark OLD implementation
		b.Run(testName("OLD", tc.memberCount), func(b *testing.B) {
			benchmarkOldImplementation(b, tc.memberCount)
		})

		// Benchmark NEW implementation
		b.Run(testName("NEW", tc.memberCount), func(b *testing.B) {
			benchmarkNewImplementation(b, tc.memberCount)
		})
	}
}

// BenchmarkNotificationServiceMemory measures total service memory footprint with many streams
// This simulates the actual MultiSyncRunner storage pattern
// Run with OLD implementation (main branch), then NEW implementation to compare
func BenchmarkNotificationServiceMemory(b *testing.B) {
	testCases := []struct {
		numStreams  int
		memberCount int
	}{
		{10, 10},   // Small: 10 streams, 10 members each
		{10, 100},  // Small streams, large membership
		{50, 10},   // Many small streams
		{50, 50},   // Medium scale
		{50, 100},  // Medium streams, large membership
		{100, 10},  // Many streams, small membership
		{100, 100}, // Large scale
	}

	for _, tc := range testCases {
		name := fmt.Sprintf("%d_streams_%d_members", tc.numStreams, tc.memberCount)

		b.Run(name, func(b *testing.B) {
			benchmarkActualNotificationService(b, tc.numStreams, tc.memberCount)
		})
	}
}

func testName(impl string, memberCount int) string {
	return impl + "_" + formatMemberCount(memberCount) + "members"
}

func formatMemberCount(count int) string {
	if count < 1000 {
		return string(rune('0' + count/10))
	}
	return string(rune('0'+count/1000)) + "k"
}

func benchmarkOldImplementation(b *testing.B, memberCount int) {
	b.StopTimer()

	// Setup infrastructure
	channelID, streamAndCookie, cleanup := setupBenchmarkInfrastructure(b, memberCount)
	defer cleanup()

	mockListener := &testStreamEventListener{}
	mockPrefs := &testUserPreferences{}
	ctx := context.Background()

	b.ReportAllocs()
	b.StartTimer()

	for i := 0; i < b.N; i++ {
		// Measure persistent heap memory
		runtime.GC()
		runtime.GC()
		var m1 runtime.MemStats
		runtime.ReadMemStats(&m1)

		// Create OLD TrackedStreamViewImpl with full StreamView
		oldView := createOldTrackedView(ctx, channelID, nil, streamAndCookie, mockListener, mockPrefs)
		runtime.KeepAlive(oldView)

		runtime.GC()
		runtime.GC()
		var m2 runtime.MemStats
		runtime.ReadMemStats(&m2)

		// Report persistent memory (not including temporary allocations)
		b.ReportMetric(float64(m2.HeapAlloc-m1.HeapAlloc)/1024, "KB/op")
	}
}

func benchmarkNewImplementation(b *testing.B, memberCount int) {
	b.StopTimer()

	// Setup infrastructure
	channelID, streamAndCookie, cleanup := setupBenchmarkInfrastructure(b, memberCount)
	defer cleanup()

	mockListener := &testStreamEventListener{}
	mockPrefs := &testUserPreferences{}
	ctx := context.Background()

	b.ReportAllocs()
	b.StartTimer()

	for i := 0; i < b.N; i++ {
		// Measure persistent heap memory
		runtime.GC()
		runtime.GC()
		var m1 runtime.MemStats
		runtime.ReadMemStats(&m1)

		// Create NEW NotificationStreamView (no full StreamView stored)
		newView, _ := notificationssync.NewNotificationStreamView(
			ctx,
			channelID,
			nil,
			streamAndCookie,
			mockListener,
			mockPrefs,
		)
		runtime.KeepAlive(newView)

		runtime.GC()
		runtime.GC()
		var m2 runtime.MemStats
		runtime.ReadMemStats(&m2)

		// Report persistent memory
		b.ReportMetric(float64(m2.HeapAlloc-m1.HeapAlloc)/1024, "KB/op")
	}
}

// setupBenchmarkInfrastructure sets up the test infrastructure and returns the channel data
func setupBenchmarkInfrastructure(b *testing.B, memberCount int) (StreamId, *StreamAndCookie, func()) {
	// Use benchmark-specific tester that doesn't call t.Parallel()
	tester := newServiceTesterForBenchmark(b, serviceTesterOpts{numNodes: 1, start: true})

	ctx := tester.ctx
	client := tester.testClient(0)

	spaceID := testutils.FakeStreamId(STREAM_SPACE_BIN)
	channelID := StreamId{STREAM_CHANNEL_BIN}
	copy(channelID[1:21], spaceID[1:21])

	// Create space owner
	owner, _ := crypto.NewWallet(ctx)
	_, _, _ = createUser(ctx, owner, client, nil)
	_, _, _ = createSpace(ctx, owner, client, spaceID, nil)
	_, _, _ = createChannel(ctx, owner, client, spaceID, channelID, nil)

	// Add members to channel
	for i := 1; i < memberCount; i++ {
		member, _ := crypto.NewWallet(ctx)
		syncCookie, _, _ := createUser(ctx, member, client, nil)
		addUserToChannel(tester.require, ctx, client, syncCookie, member, spaceID, channelID)
	}

	// Create miniblock to finalize channel state
	_, _ = makeMiniblock(ctx, client, channelID, false, 0)

	// Get stream data from the node's cache
	node := tester.nodes[0].service
	stream, _ := node.cache.GetStreamNoWait(ctx, channelID)
	view, _ := stream.GetView(ctx)
	streamAndCookie := view.GetResetStreamAndCookie(owner.Address)

	cleanupFunc := func() {
		// Cleanup handled by tester
	}

	return channelID, streamAndCookie, cleanupFunc
}

// createOldTrackedView creates a TrackedStreamViewImpl with full StreamView (OLD implementation)
func createOldTrackedView(
	ctx context.Context,
	streamID StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	listener track_streams.StreamEventListener,
	userPreferences notificationssync.UserPreferencesStore,
) events.TrackedStreamView {
	oldView := &oldNotificationsTrackedStreamView{
		listener:        listener,
		userPreferences: userPreferences,
	}

	internalView, err := oldView.TrackedStreamViewImpl.Init(
		ctx,
		streamID,
		cfg,
		stream,
		oldView.onNewEvent,
	)
	if err != nil {
		panic(err)
	}

	// OLD implementation also loads blocked users
	streamId := internalView.StreamId()
	if streamId.Type() == STREAM_USER_SETTINGS_BIN {
		user := common.BytesToAddress(streamId[1:21])
		if blockedUsers, err := internalView.BlockedUsers(); err == nil {
			blockedUsers.Each(func(address common.Address) bool {
				oldView.userPreferences.BlockUser(user, address)
				return false
			})
		}
	}

	return oldView
}

// oldNotificationsTrackedStreamView is the OLD implementation (before optimization)
type oldNotificationsTrackedStreamView struct {
	events.TrackedStreamViewImpl
	listener        track_streams.StreamEventListener
	userPreferences notificationssync.UserPreferencesStore
}

func (n *oldNotificationsTrackedStreamView) onNewEvent(
	ctx context.Context,
	view *events.StreamView,
	event *events.ParsedEvent,
) error {
	// in case the event was a block/unblock event update the users blocked list.
	streamID := view.StreamId()
	if streamID.Type() == STREAM_USER_SETTINGS_BIN {
		if settings := event.Event.GetUserSettingsPayload(); settings != nil {
			if userBlock := settings.GetUserBlock(); userBlock != nil {
				userID := common.BytesToAddress(event.Event.CreatorAddress)
				blockedUser := common.BytesToAddress(userBlock.GetUserId())

				if userBlock.GetIsBlocked() {
					n.userPreferences.BlockUser(userID, blockedUser)
				} else {
					n.userPreferences.UnblockUser(userID, blockedUser)
				}
			}
		}

		return nil
	}

	if view == nil {
		return nil
	}

	// otherwise for each member that is a member of the stream, or for anyone that is mentioned
	members, err := view.GetChannelMembers()
	if err != nil {
		return err
	}

	n.listener.OnMessageEvent(ctx, *streamID, view.StreamParentId(), members, event)
	return nil
}

// testStreamEventListener for benchmarking
type testStreamEventListener struct{}

func (l *testStreamEventListener) OnMessageEvent(
	ctx context.Context,
	streamID StreamId,
	spaceID *StreamId,
	members mapset.Set[string],
	event *events.ParsedEvent,
) {
	// No-op for benchmarking
}

// testUserPreferences for benchmarking
type testUserPreferences struct{}

func (p *testUserPreferences) BlockUser(user common.Address, blockedUser common.Address) {
	// No-op for benchmarking
}

func (p *testUserPreferences) UnblockUser(user common.Address, blockedUser common.Address) {
	// No-op for benchmarking
}

// benchmarkActualNotificationService measures notification service memory with delta measurement
// This creates an ACTUAL notification service (separate from River nodes) like production
// To compare OLD vs NEW: run with main branch (OLD), then with optimized branch (NEW)
func benchmarkActualNotificationService(b *testing.B, numStreams int, memberCount int) {
	b.StopTimer()

	// Create River node(s) to host the streams
	tester := newServiceTesterForBenchmark(b, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	client := tester.testClient(0)

	// Create streams on River node FIRST (before notification service)
	owner, _ := crypto.NewWallet(ctx)
	spaceID := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, _ = createUser(ctx, owner, client, nil)
	_, _, _ = createSpace(ctx, owner, client, spaceID, nil)

	// Track all members for subscription
	type channelMembers struct {
		channelID StreamId
		members   []*crypto.Wallet
	}
	allChannels := make([]channelMembers, 0, numStreams)

	// Create all channels
	for i := 0; i < numStreams; i++ {
		channelID := StreamId{STREAM_CHANNEL_BIN}
		copy(channelID[1:21], spaceID[1:21])
		copy(channelID[21:], []byte(fmt.Sprintf("chan%d", i)))

		_, _, _ = createChannel(ctx, owner, client, spaceID, channelID, nil)

		members := make([]*crypto.Wallet, memberCount)
		members[0] = owner // Owner is first member

		// Add other members to channel
		for j := 1; j < memberCount; j++ {
			member, _ := crypto.NewWallet(ctx)
			syncCookie, _, _ := createUser(ctx, member, client, nil)
			addUserToChannel(tester.require, ctx, client, syncCookie, member, spaceID, channelID)
			members[j] = member
		}

		allChannels = append(allChannels, channelMembers{channelID: channelID, members: members})

		// Create miniblock
		_, _ = makeMiniblock(ctx, client, channelID, false, 0)
	}

	// BASELINE MEASUREMENT: After River node + streams setup, before notification service
	runtime.GC()
	runtime.GC()
	var baseline runtime.MemStats
	runtime.ReadMemStats(&baseline)

	// NOW initialize notification service AFTER streams are created (like TestNotificationsColdStreams)
	notificationService := initNotificationServiceBench(ctx, tester)

	// Create HTTP clients to notification service
	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(ctx, tester.getConfig())
	notificationClient := protocolconnect.NewNotificationServiceClient(
		httpClient, "https://"+notificationService.listener.Addr().String())
	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, "https://"+notificationService.listener.Addr().String())

	// NOW subscribe ONE user per stream to notification service
	// This is when MultiSyncRunner creates tracked views
	// Following TestNotificationsColdStreams pattern - subscribe only one user per stream
	for _, ch := range allChannels {
		member := ch.members[0] // Subscribe only first member (owner)
		subscribeUserWebPush(ctx, member, tester.require, authClient, notificationClient)
	}

	// Wait for notification service to track all streams
	time.Sleep(2 * time.Second)

	// FINAL MEASUREMENT: After notification service + subscriptions
	runtime.GC()
	runtime.GC()
	var final runtime.MemStats
	runtime.ReadMemStats(&final)

	// Report DELTA (notification service memory only, excluding River node infrastructure)
	deltaBytes := final.HeapAlloc - baseline.HeapAlloc
	deltaMB := float64(deltaBytes) / 1024 / 1024
	deltaPerStreamKB := float64(deltaBytes) / float64(numStreams) / 1024

	b.ReportMetric(deltaMB, "MB_delta")
	b.ReportMetric(deltaPerStreamKB, "KB_per_stream_delta")

	b.Logf("Notification Service (delta) - Total: %.2f MB, Per-stream: %.2f KB", deltaMB, deltaPerStreamKB)

	// Close notification service to clean up goroutines
	if notificationService != nil {
		notificationService.Close()
	}
}

// Helper functions for notification service benchmarking

type notificationCaptureBench struct {
	WebPushNotifications map[common.Hash]map[common.Address]int
	ApnPushNotifications map[common.Hash]map[common.Address]int
}

func (nc *notificationCaptureBench) SendWebPushNotification(
	_ context.Context,
	subscription *webpush.Subscription,
	eventHash common.Hash,
	_ []byte,
	_ string,
) (bool, error) {
	// No-op for benchmarking
	return true, nil
}

func (nc *notificationCaptureBench) SendApplePushNotification(
	_ context.Context,
	_ *types.APNPushSubscription,
	eventHash common.Hash,
	_ *payload2.Payload,
	_ bool,
	_ string,
) (bool, int, error) {
	// No-op for benchmarking
	return true, 0, nil
}

func initNotificationServiceBench(ctx context.Context, tester *serviceTester) *Service {
	var key [32]byte
	_, err := rand.Read(key[:])
	if err != nil {
		panic(err)
	}

	cfg := tester.getConfig()
	cfg.Notifications.Authentication.SessionToken.Key.Algorithm = "HS256"
	cfg.Notifications.Authentication.SessionToken.Key.Key = hex.EncodeToString(key[:])
	cfg.Notifications.StreamTracking.StreamsPerSyncSession = 4
	cfg.Notifications.ColdStreamsEnabled = true

	nc := &notificationCaptureBench{
		WebPushNotifications: make(map[common.Hash]map[common.Address]int),
		ApnPushNotifications: make(map[common.Hash]map[common.Address]int),
	}

	service, err := StartServerInNotificationMode(ctx, cfg, nc, makeTestServerOpts(tester))
	if err != nil {
		panic(err)
	}

	return service
}

func subscribeUserWebPush(
	ctx context.Context,
	user *crypto.Wallet,
	req *require.Assertions,
	authClient protocolconnect.AuthenticationServiceClient,
	notificationClient protocolconnect.NotificationServiceClient,
) {
	userID := user.Address

	h := sha256.New()
	h.Write(userID[:])
	p256Dh := hex.EncodeToString(h.Sum(nil))
	h.Write(userID[:])
	auth := hex.EncodeToString(h.Sum(nil))

	request := connect.NewRequest(&SubscribeWebPushRequest{
		Subscription: &WebPushSubscriptionObject{
			Endpoint: userID.String(),
			Keys: &WebPushSubscriptionObjectKeys{
				P256Dh: p256Dh,
				Auth:   auth,
			},
		},
	})

	// Authenticate the request
	authentication.Authenticate(ctx, "NS_AUTH:", req, authClient, user, request)

	_, err := notificationClient.SubscribeWebPush(ctx, request)
	req.NoError(err, "SubscribeWebPush failed")
}
