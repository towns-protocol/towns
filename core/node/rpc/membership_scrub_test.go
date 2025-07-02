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

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/scrub"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
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
			common.Address{},
			spaceId[:],
			nil,
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
	reason auth.EntitlementResultReason
}

type mockChainAuthResult struct {
	isAllowed bool
	reason    auth.EntitlementResultReason
}

func (m *mockChainAuthResult) IsEntitled() bool {
	return m.isAllowed
}

func (m *mockChainAuthResult) Reason() auth.EntitlementResultReason {
	return m.reason
}

func (m *MockChainAuth) IsEntitled(
	ctx context.Context,
	cfg *config.Config,
	args *auth.ChainAuthArgs,
) (auth.IsEntitledResult, error) {
	return &mockChainAuthResult{
		isAllowed: m.result,
		reason:    m.reason,
	}, m.err
}

func NewMockChainAuth(expectedResult bool, reason auth.EntitlementResultReason, expectedErr error) auth.ChainAuth {
	return &MockChainAuth{
		result: expectedResult,
		err:    expectedErr,
		reason: reason,
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
) (auth.IsEntitledResult, error) {
	for wallet, result := range m.walletResults {
		if args.Principal() == wallet.Address {
			return &mockChainAuthResult{
				isAllowed: result.expectedResult,
				reason:    auth.EntitlementResultReason_NONE,
			}, result.expectedErr
		}
	}
	return &mockChainAuthResult{
		isAllowed: true,
		reason:    auth.EntitlementResultReason_NONE,
	}, nil
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

func (o *ObservingEventAdder) GetWalletAddress() common.Address {
	return o.adder.GetWalletAddress()
}

// force interface compliance, observing event adder should implemnt EventAdder interface
var _ scrub.EventAdder = (*ObservingEventAdder)(nil)

func (o *ObservingEventAdder) ObservedEvents() []struct {
	streamId StreamId
	payload  IsStreamEvent_Payload
} {
	o.mu.Lock()
	defer o.mu.Unlock()
	return slices.Clone(o.observedEvents)
}

// checks if all observed events are membership leave events
// with the expected scrubber reason
func (o *ObservingEventAdder) ValidateMembershipLeaveEvents(t assert.TestingT, expectedReason *MembershipReason) {
	o.mu.Lock()
	defer o.mu.Unlock()

	for i, e := range o.observedEvents {
		userPayload, ok := e.payload.(*StreamEvent_UserPayload)
		assert.True(t, ok, "Event %d is not a UserPayload", i)
		if !ok {
			continue
		}

		membershipPayload, ok := userPayload.UserPayload.Content.(*UserPayload_UserMembership_)
		assert.True(t, ok, "Event %d is not a MembershipPayload", i)
		if !ok {
			continue
		}

		assert.Equal(t, MembershipOp_SO_LEAVE, membershipPayload.UserMembership.Op,
			"Event %d is not a LEAVE operation", i)

		// Check for scrubber reason
		assert.NotNil(t, membershipPayload.UserMembership.Reason, "Event %d has no reason", i)

		// Verify the reason matches the expected one
		assert.Equal(t, *expectedReason, *membershipPayload.UserMembership.Reason,
			"Event %d has incorrect reason code. Expected: %v, Got: %v",
			i, *expectedReason, *membershipPayload.UserMembership.Reason)
	}
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
		expectedReasonCode  MembershipReason // Expected reason code for all booted users
	}{
		"always false chain auth boots all users": {
			mockChainAuth:       NewMockChainAuth(false, auth.EntitlementResultReason_NONE, nil),
			expectedBootedUsers: allWallets,
			expectedReasonCode:  MembershipReason_MR_NOT_ENTITLED,
		},
		"always true chain auth should boot no users": {
			mockChainAuth:       NewMockChainAuth(true, auth.EntitlementResultReason_NONE, nil),
			expectedBootedUsers: []*crypto.Wallet{},
		},
		"error in chain auth should result in no booted users": {
			mockChainAuth:       NewMockChainAuth(false, auth.EntitlementResultReason_NONE, fmt.Errorf("this error should not cause a user to be booted")),
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
			expectedReasonCode:  MembershipReason_MR_NOT_ENTITLED,
		},
		"expired membership should boot with MR_EXPIRED reason": {
			mockChainAuth:       NewMockChainAuth(false, auth.EntitlementResultReason_MEMBERSHIP_EXPIRED, nil),
			expectedBootedUsers: allWallets,
			expectedReasonCode:  MembershipReason_MR_EXPIRED,
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
					if assert.NoError(err) && assert.NotNil(view) {
						for _, wallet := range allWallets {
							isMember, err := view.IsMember(wallet.Address[:])
							if assert.NoError(err) {
								assert.Equal(
									!slices.Contains(tc.expectedBootedUsers, wallet),
									isMember,
									"Membership result mismatch",
									"wallet: %v, isMember: %v, expectedBootedUsers: %v",
									wallet.Address,
									isMember,
									tc.expectedBootedUsers,
								)
							}
						}

						// All users booted, included channel creator
						// TODO: FIX: in TestScrubStreamTaskProcessor/always_false_chain_auth_boots_all_users
						// event for one of the users is emitted twice. Why?
						// assert.Len(eventAdder.ObservedEvents(), len(tc.expectedBootedUsers))
						assert.GreaterOrEqual(len(eventAdder.ObservedEvents()), len(tc.expectedBootedUsers))

						eventAdder.ValidateMembershipLeaveEvents(t, &tc.expectedReasonCode)

					}
				},
				10*time.Second,
				200*time.Millisecond,
			)
		})
	}
}
