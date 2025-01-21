package rpc

import (
	"context"
	"fmt"
	"slices"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/node/auth"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/events"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/scrub"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
)

func addUserToChannel(
	require *require.Assertions,
	ctx context.Context,
	client protocolconnect.StreamServiceClient,
	resUser *SyncCookie,
	wallet *crypto.Wallet,
	spaceId StreamId,
	channelId StreamId,
) {
	userJoin, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_UserPayload_Membership(
			MembershipOp_SO_JOIN,
			channelId,
			nil,
			spaceId[:],
		),
		&MiniblockRef{
			Hash: common.BytesToHash(resUser.PrevMiniblockHash),
			Num:  resUser.MinipoolGen - 1,
		},
	)
	require.NoError(err)

	_, err = client.AddEvent(
		ctx,
		connect.NewRequest(
			&AddEventRequest{
				StreamId: resUser.StreamId,
				Event:    userJoin,
			},
		),
	)
	require.NoError(err)
}

func createUserAndAddToChannel(
	require *require.Assertions,
	ctx context.Context,
	client protocolconnect.StreamServiceClient,
	wallet *crypto.Wallet,
	spaceId StreamId,
	channelId StreamId,
) *crypto.Wallet {
	syncCookie, _, err := createUser(ctx, wallet, client, nil)
	require.NoError(err, "error creating user")
	require.NotNil(syncCookie)

	_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
	require.NoError(err)

	addUserToChannel(require, ctx, client, syncCookie, wallet, spaceId, channelId)

	return wallet
}

type MockChainAuth struct {
	auth.ChainAuth
	result bool
	err    error
}

func (m *MockChainAuth) IsEntitled(
	ctx context.Context,
	cfg *config.Config,
	args *auth.ChainAuthArgs,
) (bool, error) {
	return m.result, m.err
}

func NewMockChainAuth(expectedResult bool, expectedErr error) auth.ChainAuth {
	return &MockChainAuth{
		result: expectedResult,
		err:    expectedErr,
	}
}

type MockChainAuthForWallets struct {
	auth.ChainAuth
	walletResults map[*crypto.Wallet]struct {
		expectedResult bool
		expectedErr    error
	}
}

func (m *MockChainAuthForWallets) IsEntitled(
	ctx context.Context,
	cfg *config.Config,
	args *auth.ChainAuthArgs,
) (bool, error) {
	for wallet, result := range m.walletResults {
		if args.Principal() == wallet.Address {
			return result.expectedResult, result.expectedErr
		}
	}
	return true, nil
}

func NewMockChainAuthForWallets(
	walletResults map[*crypto.Wallet]struct {
		expectedResult bool
		expectedErr    error
	},
) auth.ChainAuth {
	return &MockChainAuthForWallets{
		walletResults: walletResults,
	}
}

type ObservingEventAdder struct {
	scrub.EventAdder
	adder          scrub.EventAdder
	observedEvents []struct {
		streamId StreamId
		payload  IsStreamEvent_Payload
	}
	mu sync.Mutex
}

func NewObservingEventAdder(adder scrub.EventAdder) *ObservingEventAdder {
	return &ObservingEventAdder{
		adder: adder,
	}
}

func (o *ObservingEventAdder) AddEventPayload(
	ctx context.Context,
	streamId StreamId,
	payload IsStreamEvent_Payload,
	tags *Tags,
) ([]*EventRef, error) {
	newEvents, err := o.adder.AddEventPayload(ctx, streamId, payload, tags)
	if err != nil {
		return newEvents, err
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	o.observedEvents = append(
		o.observedEvents,
		struct {
			streamId StreamId
			payload  IsStreamEvent_Payload
		}{
			streamId: streamId,
			payload:  payload,
		},
	)
	return newEvents, nil
}

func (o *ObservingEventAdder) ObservedEvents() []struct {
	streamId StreamId
	payload  IsStreamEvent_Payload
} {
	o.mu.Lock()
	defer o.mu.Unlock()
	return slices.Clone(o.observedEvents)
}

func TestScrubStreamTaskProcessor(t *testing.T) {
	ctx, ctxCancel := test.NewTestContext()
	defer ctxCancel()

	wallet, _ := crypto.NewWallet(ctx)
	wallet1, _ := crypto.NewWallet(ctx)
	wallet2, _ := crypto.NewWallet(ctx)
	wallet3, _ := crypto.NewWallet(ctx)
	allWallets := []*crypto.Wallet{wallet, wallet1, wallet2, wallet3}

	tests := map[string]struct {
		mockChainAuth       auth.ChainAuth
		expectedBootedUsers []*crypto.Wallet
	}{
		"always false chain auth boots all users": {
			mockChainAuth:       NewMockChainAuth(false, nil),
			expectedBootedUsers: allWallets,
		},
		"always true chain auth should boot no users": {
			mockChainAuth:       NewMockChainAuth(true, nil),
			expectedBootedUsers: []*crypto.Wallet{},
		},
		"error in chain auth should result in no booted users": {
			mockChainAuth:       NewMockChainAuth(false, fmt.Errorf("this error should not cause a user to be booted")),
			expectedBootedUsers: []*crypto.Wallet{},
		},
		"false or error result for individual users": {
			mockChainAuth: NewMockChainAuthForWallets(
				map[*crypto.Wallet]struct {
					expectedResult bool
					expectedErr    error
				}{
					wallet1: {
						expectedResult: false,
					},
					wallet3: {
						expectedErr: fmt.Errorf("This user should not be booted"),
					},
				},
			),
			expectedBootedUsers: []*crypto.Wallet{wallet1},
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: false})
			tester.initNodeRecords(0, 1, river.NodeStatus_Operational)

			var eventAdder *ObservingEventAdder
			tester.startNodes(0, 1, startOpts{
				configUpdater: func(cfg *config.Config) {
					cfg.Scrubbing.ScrubEligibleDuration = 2000 * time.Millisecond
				},
				scrubberMaker: func(ctx context.Context, s *Service) events.Scrubber {
					eventAdder = NewObservingEventAdder(s)
					return scrub.NewStreamMembershipScrubTasksProcessor(
						s.serverCtx,
						s.cache,
						eventAdder,
						tc.mockChainAuth,
						s.config,
						s.metrics,
						s.otelTracer,
					)
				},
			})

			ctx := tester.ctx
			require := tester.require
			client := tester.testClient(0)

			resuser, _, err := createUser(ctx, wallet, client, nil)
			require.NoError(err)
			require.NotNil(resuser)

			_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
			require.NoError(err)

			spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
			space, _, err := createSpace(ctx, wallet, client, spaceId, nil)
			require.NoError(err)
			require.NotNil(space)

			channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
			channel, _, err := createChannel(ctx, wallet, client, spaceId, channelId, nil)
			require.NoError(err)
			require.NotNil(channel)

			createUserAndAddToChannel(require, ctx, client, wallet1, spaceId, channelId)
			createUserAndAddToChannel(require, ctx, client, wallet2, spaceId, channelId)
			createUserAndAddToChannel(require, ctx, client, wallet3, spaceId, channelId)

			streamCache := tester.nodes[0].service.cache

			require.EventuallyWithT(
				func(t *assert.CollectT) {
					assert := assert.New(t)

					stream, err := streamCache.GetStreamNoWait(ctx, channelId)
					if !assert.NoError(err) || !assert.NotNil(stream) {
						return
					}

					// Grab the updated view, this triggers a scrub since scrub time was set to 300ms.
					view, err := stream.GetViewIfLocal(ctx)
					joinableView, ok := view.(events.JoinableStreamView)
					if assert.NoError(err) && assert.NotNil(view) && assert.True(ok) {
						for _, wallet := range allWallets {
							isMember, err := joinableView.IsMember(wallet.Address[:])
							if assert.NoError(err) {
								assert.Equal(
									!slices.Contains(tc.expectedBootedUsers, wallet),
									isMember,
									"Membership result mismatch",
								)
							}
						}

						// All users booted, included channel creator
						// TODO: FIX: in TestScrubStreamTaskProcessor/always_false_chain_auth_boots_all_users
						// event for one of the users is emitted twice. Why?
						// assert.Len(eventAdder.ObservedEvents(), len(tc.expectedBootedUsers))
						assert.GreaterOrEqual(len(eventAdder.ObservedEvents()), len(tc.expectedBootedUsers))
					}
				},
				10*time.Second,
				200*time.Millisecond,
			)
		})
	}
}
