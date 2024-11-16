package rpc

import (
	"context"
	"fmt"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/config"
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
) error {
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

	return o.adder.AddEventPayload(ctx, streamId, payload)
}

// waitFor accepts a function that evaluates to a true or false result and waits
// for the function to change result from false to true, timing out and failing the
// test if it does not change.
func waitFor(t *testing.T, condition func() bool, timeout time.Duration) {
	success := make(chan bool)
	timeoutTimer := time.After(timeout)
	ticker := time.NewTicker(time.Second)

	// Evaluate condition once per second, returning on timeout or condition true
	go func() {
		for {
			select {
			case <-timeoutTimer:
				success <- false
				return
			case <-ticker.C:
				if condition() {
					success <- true
					return
				}
			}
		}
	}()

	result := <-success
	if !result {
		t.Error("timeout while waiting for condition")
	}
}

func TestScrubStreamTaskProcessor(t *testing.T) {
	ctx, _ := test.NewTestContext()
	wallet, _ := crypto.NewWallet(ctx)
	wallet1, err := crypto.NewWallet(ctx)
	require.NoError(t, err, "error creating wallet")
	wallet2, err := crypto.NewWallet(ctx)
	require.NoError(t, err, "error creating wallet")
	wallet3, err := crypto.NewWallet(ctx)
	require.NoError(t, err, "error creating wallet")

	tests := map[string]struct {
		mockChainAuth       auth.ChainAuth
		expectedBootedUsers []*crypto.Wallet
	}{
		"always false chain auth boots all users": {
			mockChainAuth:       NewMockChainAuth(false, nil),
			expectedBootedUsers: []*crypto.Wallet{wallet, wallet1, wallet2, wallet3},
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
			tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})

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

			service := tester.nodes[0].service
			streamCache := service.cache

			stream, err := streamCache.GetStream(ctx, channelId)
			require.NoError(err)

			view, err := stream.GetView(ctx)
			require.NotNil(view)
			require.NoError(err)

			joinableView, ok := view.(events.JoinableStreamView)
			require.True(ok)

			// Sanity check: state of the stream is that all 4 users are members.
			for _, wallet := range []*crypto.Wallet{wallet, wallet1, wallet2, wallet3} {
				isMember, err := joinableView.IsMember(wallet.Address[:])
				require.NoError(err)
				require.True(isMember)
			}

			eventAdder := NewObservingEventAdder(service)
			taskScrubber, err := scrub.NewStreamScrubTasksProcessor(
				ctx,
				streamCache,
				eventAdder,
				tc.mockChainAuth,
				service.config,
				nil,
				nil,
				common.Address{},
			)
			require.NoError(err)

			// We check for the scrub to finish by waiting for the last scrubbed timestamp on the
			// stream to exceed this value. The previous channel operations likely already triggered
			// a scrub on the stream, so this value is already nonzero.
			now := time.Now()

			scheduled, err := taskScrubber.TryScheduleScrub(ctx, stream, true)
			require.Nil(err, "task scheduling error")
			require.True(scheduled)

			require.NoError(err)
			waitFor(
				t,
				func() bool { return stream.LastScrubbedTime().After(now) },
				30*time.Second,
			)

			// Grab the updated view
			view, err = stream.GetView(ctx)
			require.NotNil(view)
			require.NoError(err)

			joinableView, ok = view.(events.JoinableStreamView)
			require.True(ok)

			expectedMembership := make(map[*crypto.Wallet]bool, 4)

			for _, wallet := range []*crypto.Wallet{wallet, wallet1, wallet2, wallet3} {
				expectedMembership[wallet] = true
			}
			for _, wallet := range tc.expectedBootedUsers {
				expectedMembership[wallet] = false
			}

			for wallet, expectedMembership := range expectedMembership {
				isMember, err := joinableView.IsMember(wallet.Address[:])
				require.Equal(expectedMembership, isMember)
				require.NoError(err)
			}

			// All users booted, included channel creator
			require.Len(eventAdder.observedEvents, len(tc.expectedBootedUsers))
		})
	}
}
