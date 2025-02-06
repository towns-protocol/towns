package rpc

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"math/big"
	"net/http"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/SherClockHolmes/webpush-go"
	"github.com/ethereum/go-ethereum/common"
	eth_crypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/google/go-cmp/cmp"
	payload2 "github.com/sideshow/apns2/payload"
	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/node/authentication"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/notifications/push"
	"github.com/river-build/river/core/node/notifications/types"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/testcert"
)

func authenticateNS[T any](
	ctx context.Context,
	req *require.Assertions,
	authClient protocolconnect.AuthenticationServiceClient,
	primaryWallet *crypto.Wallet,
	request *connect.Request[T],
) {
	authentication.Authenticate(
		ctx,
		"NS_AUTH:",
		req,
		authClient,
		primaryWallet,
		request,
	)
}

var notificationDeliveryDelay = 30 * time.Second

// TestNotifications is designed in such a way that all tests are run in parallel
// and share the same set of nodes, notification service and client.
func TestNotifications(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	notifications := &notificationCapture{
		WebPushNotifications: make(map[common.Hash]map[common.Address]int),
		ApnPushNotifications: make(map[common.Hash]map[common.Address]int),
	}

	notificationService := initNotificationService(ctx, tester, notifications)

	httpClient, _ := testcert.GetHttp2LocalhostTLSClient(ctx, tester.getConfig())

	notificationClient := protocolconnect.NewNotificationServiceClient(
		httpClient, "https://"+notificationService.listener.Addr().String())

	authClient := protocolconnect.NewAuthenticationServiceClient(
		httpClient, "https://"+notificationService.listener.Addr().String())

	tester.parallelSubtest("DMNotifications", func(tester *serviceTester) {
		testDMNotifications(tester, notificationClient, authClient, notifications)
	})

	tester.parallelSubtest("GDMNotifications", func(tester *serviceTester) {
		testGDMNotifications(tester, notificationClient, authClient, notifications)
	})

	tester.parallelSubtest("SpaceChannelNotification", func(tester *serviceTester) {
		testSpaceChannelNotifications(tester, notificationClient, authClient, notifications)
	})
}

func testGDMNotifications(
	tester *serviceTester,
	notificationClient protocolconnect.NotificationServiceClient,
	authClient protocolconnect.AuthenticationServiceClient,
	notifications *notificationCapture,
) {
	tester.parallelSubtest("MessageWithNoMentionsRepliesAndReaction", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupGDMNotificationTest(ctx, tester, notificationClient, authClient)
		testGDMMessageWithNoMentionsRepliesAndReaction(ctx, test, notifications)
	})

	tester.parallelSubtest("ReactionMessage", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupGDMNotificationTest(ctx, tester, notificationClient, authClient)
		testGDMReactionMessage(ctx, test, notifications)
	})

	tester.parallelSubtest("TipMessage", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupGDMNotificationTest(ctx, tester, notificationClient, authClient)
		testGDMTipMessage(ctx, test, notifications)
	})

	tester.parallelSubtest("APNUnsubscribe", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupGDMNotificationTest(ctx, tester, notificationClient, authClient)
		testGDMAPNNotificationAfterUnsubscribe(ctx, test, notifications)
	})
}

func testGDMAPNNotificationAfterUnsubscribe(
	ctx context.Context,
	test *gdmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	test.tester.t.Skip("Flaky test with userA not receiving first event before unsubscribing from APN notifications")

	// user A and B share an Apple device.
	// user A and C join a GDM channel.
	// User A unsubscribes from APN notifications on the device.
	// User B uses the same device and subscribes for notification but is not part of the GDM channel that A and C share
	// User C sends a message to the GDM channel and tags user A in it.
	// Expected outcome is that A (not subscribed) and B (not a GDM member) don't receive a notification.
	userA := test.members[4]
	userB, err := crypto.NewWallet(ctx)
	test.req.NoError(err, "new wallet")
	userC := test.members[5]

	// userA subscribes for APN
	test.subscribeApnPush(ctx, userA)

	// send a message from userC that userA must receive a notification for because A is a member of GDM.
	expectedUsersToReceiveNotification := map[common.Address]int{userA.Address: 1}
	event := test.sendMessageWithTags(ctx, userC, "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)

	test.req.Eventuallyf(func() bool {
		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		notificationsForEvent := nc.ApnPushNotifications[eventHash]

		return cmp.Equal(notificationsForEvent, expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 2500*time.Millisecond, "Didn't receive expected notifications for stream %s", test.gdmStreamID)

	// userA unsubscribes and userB subscribes using the same device.
	// for tests the deviceToken is the users wallet address, in this case
	// userB "reuses" the device with deviceToken which is userA wallet address.
	test.unsubscribeApnPush(ctx, userA)

	request := connect.NewRequest(&SubscribeAPNRequest{
		DeviceToken: userA.Address[:],
		Environment: APNEnvironment_APN_ENVIRONMENT_SANDBOX,
	})

	authenticateNS(ctx, test.req, test.authClient, userB, request)
	_, err = test.notificationClient.SubscribeAPN(ctx, request)
	test.req.NoError(err, "SubscribeAPN failed")

	// make sure userA has no APN subscriptions and userB has the just created sub
	getSettingsRequest := connect.NewRequest(&GetSettingsRequest{})
	authenticateNS(ctx, test.req, test.authClient, userA, getSettingsRequest)
	resp, err := test.notificationClient.GetSettings(ctx, getSettingsRequest)
	test.req.NoError(err, "GetSettings failed")
	test.req.Empty(resp.Msg.GetApnSubscriptions(), "got APN subs")

	authenticateNS(ctx, test.req, test.authClient, userB, getSettingsRequest)
	resp, err = test.notificationClient.GetSettings(ctx, getSettingsRequest)
	test.req.NoError(err, "GetSettings failed")
	test.req.Equal(1, len(resp.Msg.GetApnSubscriptions()), "got no APN subs")

	// userC sends another message and Tags userA in it.
	event = test.sendMessageWithTags(ctx, userC, "hi!", &Tags{
		MentionedUserAddresses: [][]byte{userA.Address[:]},
	})
	eventHash = common.BytesToHash(event.Hash)

	// Ensure that no notifications are received for this event because none of the user in the GDM
	// has an APN subscription and userB isn't a member of the GDM.
	test.req.Never(func() bool {
		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		notificationsForEvent := nc.ApnPushNotifications[eventHash]

		return len(notificationsForEvent) != 0
	}, notificationDeliveryDelay, 2500*time.Millisecond, "Receive unexpected notification")
}

func testGDMMessageWithNoMentionsRepliesAndReaction(
	ctx context.Context,
	test *gdmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	expectedUsersToReceiveNotification := make(map[common.Address]int)

	// by default all members should receive a notification for GDM messages
	for _, member := range test.members {
		test.subscribeWebPush(ctx, member)
		test.subscribeApnPush(ctx, member)

		expectedUsersToReceiveNotification[member.Address] = 1
	}

	// member disabled all GDM messages on the global level and should not get a notification
	member := test.members[1]
	test.setGlobalGDMSetting(ctx, member, GdmChannelSettingValue_GDM_MESSAGES_NO)
	delete(expectedUsersToReceiveNotification, member.Address)

	// member disabled GDM message on this particular channel and should not get a notification
	member = test.members[2]
	test.setGDMChannelSetting(ctx, member, GdmChannelSettingValue_GDM_MESSAGES_NO)
	delete(expectedUsersToReceiveNotification, member.Address)

	// member disabled all GDM messages on the global level and should not get a notification
	member = test.members[3]
	test.setGlobalGDMSetting(ctx, member, GdmChannelSettingValue_GDM_MESSAGES_NO_AND_MUTE)
	delete(expectedUsersToReceiveNotification, member.Address)

	// member disabled GDM message on this particular channel and should not get a notification
	member = test.members[4]
	test.setGDMChannelSetting(ctx, member, GdmChannelSettingValue_GDM_MESSAGES_NO_AND_MUTE)
	delete(expectedUsersToReceiveNotification, member.Address)

	// member only wants a notification for GDM message he is mentioned or are a reply/reaction to his own message
	// on global level
	member = test.members[5]
	test.setGlobalGDMSetting(ctx, member, GdmChannelSettingValue_GDM_ONLY_MENTIONS_REPLIES_REACTIONS)
	delete(expectedUsersToReceiveNotification, member.Address)

	// member only wants a notification for GDM message he is mentioned or are a reply/reaction to his own message
	// on this GDM channel
	member = test.members[6]
	test.setGDMChannelSetting(ctx, member, GdmChannelSettingValue_GDM_ONLY_MENTIONS_REPLIES_REACTIONS)
	delete(expectedUsersToReceiveNotification, member.Address)

	// send GDM message with no tags
	sender := test.members[0]
	delete(expectedUsersToReceiveNotification, sender.Address)
	event := test.sendMessageWithTags(
		ctx, sender, "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)

	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		webNotifications := nc.WebPushNotifications[eventHash]
		apnNotifications := nc.ApnPushNotifications[eventHash]

		return cmp.Equal(webNotifications, expectedUsersToReceiveNotification) &&
			cmp.Equal(apnNotifications, expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 2500*time.Millisecond, "Didn't receive expected notifications for stream %s", test.gdmStreamID)

	// Wait a bit to ensure that no more notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()
		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		return !cmp.Equal(nc.WebPushNotifications[eventHash], expectedUsersToReceiveNotification) ||
			!cmp.Equal(nc.ApnPushNotifications[eventHash], expectedUsersToReceiveNotification)
	}, time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

// User A, B and C in GDM
// User A in GDM posts a message
// User B reacts to user A
// User A should get a reaction notification, but user C should not
func testGDMReactionMessage(
	ctx context.Context,
	test *gdmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	userA := test.members[0]
	userB := test.members[1]
	userC := test.members[2]

	test.subscribeWebPush(ctx, userA)
	test.subscribeWebPush(ctx, userB)
	test.subscribeWebPush(ctx, userC)

	// reaction on a GDM message
	event := test.sendMessageWithTags(ctx, userB, "hi!", &Tags{
		MessageInteractionType:     MessageInteractionType_MESSAGE_INTERACTION_TYPE_REACTION,
		ParticipatingUserAddresses: [][]byte{userA.Address[:]},
	})

	eventHash := common.BytesToHash(event.Hash)
	expectedUsersToReceiveNotification := map[common.Address]int{userA.Address: 1}

	// ensure that user A received notificaton
	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()

		return cmp.Equal(nc.WebPushNotifications[eventHash], expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 100*time.Millisecond, "user A Didn't receive expected notification for stream %s", test.gdmStreamID)
}

// User A, B and C in GDM
// User A in GDM posts a message
// User B tips user A
// User A should get a reaction notification, but user C should not
func testGDMTipMessage(
	ctx context.Context,
	test *gdmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	userA := test.members[0]
	userB := test.members[1]
	userC := test.members[2]

	test.subscribeWebPush(ctx, userA)
	test.subscribeWebPush(ctx, userB)
	test.subscribeWebPush(ctx, userC)

	messageEvent := test.sendMessageWithTags(ctx, userA, "hi!", nil)

	// tip on a GDM message
	event := test.sendTip(ctx, userB, userA, messageEvent.Hash)

	test.req.NotNil(event, "tip event is nil")

	eventHash := common.BytesToHash(event.Hash)
	expectedUsersToReceiveNotification := map[common.Address]int{userA.Address: 1}

	// ensure that user A received notificaton
	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()

		return cmp.Equal(nc.WebPushNotifications[eventHash], expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 100*time.Millisecond, "user A Didn't receive expected tip notification for stream %s", test.gdmStreamID)

	// ensure that user B and C never get a notification
	test.req.Never(func() bool {
		nc.ApnPushNotificationsMu.Lock()
		gotAPN := len(nc.ApnPushNotifications[eventHash]) > 0
		nc.ApnPushNotificationsMu.Unlock()

		nc.WebPushNotificationsMu.Lock()
		notEqual := !cmp.Equal(nc.WebPushNotifications[eventHash], expectedUsersToReceiveNotification)
		nc.WebPushNotificationsMu.Unlock()

		return gotAPN || notEqual
	}, 5*time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

func testDMNotifications(
	tester *serviceTester,
	notificationClient protocolconnect.NotificationServiceClient,
	authClient protocolconnect.AuthenticationServiceClient,
	notifications *notificationCapture,
) {
	tester.sequentialSubtest("MessageWithDefaultUserNotificationsPreferences", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupDMNotificationTest(ctx, tester, notificationClient, authClient)
		testDMMessageWithDefaultUserNotificationsPreferences(ctx, test, notifications)
	})

	tester.sequentialSubtest("DMMessageWithNotificationsMutedOnDmChannel", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupDMNotificationTest(ctx, tester, notificationClient, authClient)
		testDMMessageWithNotificationsMutedOnDmChannel(ctx, test, notifications)
	})

	tester.sequentialSubtest("DMMessageWithNotificationsMutedGlobal", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupDMNotificationTest(ctx, tester, notificationClient, authClient)
		testDMMessageWithNotificationsMutedGlobal(ctx, test, notifications)
	})

	tester.sequentialSubtest("MessageWithBlockedUser", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupDMNotificationTest(ctx, tester, notificationClient, authClient)
		testDMMessageWithBlockedUser(ctx, test, notifications)
	})
}

func testDMMessageWithNotificationsMutedOnDmChannel(
	ctx context.Context,
	test *dmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	test.setChannel(ctx, test.member, DmChannelSettingValue_DM_MESSAGES_NO)

	// sender will never receive a notification for his own message and user DM stream member has
	// muted the channel -> no notifications
	expectedNotifications := 0

	test.subscribeWebPush(ctx, test.initiator)
	test.subscribeWebPush(ctx, test.member)
	test.subscribeApnPush(ctx, test.initiator)
	test.subscribeApnPush(ctx, test.member)

	// send a message and ensure that all expected notification are captured
	event := test.sendMessageWithTags(
		ctx, test.initiator, "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)

	// Wait a bit to ensure that no more notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount != expectedNotifications || apnCount != expectedNotifications
	}, time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

func testDMMessageWithNotificationsMutedGlobal(
	ctx context.Context,
	test *dmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	// receiver of message has muted notifications
	expectedUsersToReceiveNotification := 0

	test.muteGlobal(ctx, test.member, DmChannelSettingValue_DM_MESSAGES_NO)

	test.subscribeWebPush(ctx, test.initiator)
	test.subscribeWebPush(ctx, test.member)
	test.subscribeApnPush(ctx, test.initiator)
	test.subscribeApnPush(ctx, test.member)

	// send a message and ensure that all expected notification are captured
	event := test.sendMessageWithTags(
		ctx, test.initiator, "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)

	// Wait a bit to ensure that no more notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount != expectedUsersToReceiveNotification || apnCount != expectedUsersToReceiveNotification
	}, time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

func testDMMessageWithDefaultUserNotificationsPreferences(
	ctx context.Context,
	test *dmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	// only test.member is expected to get a notification because test.initiator will be the message sender
	expectedUsersToReceiveNotification := map[common.Address]int{
		test.member.Address: 1,
	}

	test.subscribeWebPush(ctx, test.initiator)
	test.subscribeWebPush(ctx, test.member)
	test.subscribeApnPush(ctx, test.initiator)
	test.subscribeApnPush(ctx, test.member)

	// send a message and ensure that all expected notification are captured
	event := test.sendMessageWithTags(
		ctx, test.initiator, "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)

	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		webNotifications := nc.WebPushNotifications[eventHash]
		apnNotifications := nc.ApnPushNotifications[eventHash]

		return cmp.Equal(webNotifications, expectedUsersToReceiveNotification) &&
			cmp.Equal(apnNotifications, expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 100*time.Millisecond, "Didn't receive expected notifications for stream %s", test.dmStreamID)

	// Wait a bit to ensure that no more notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount != len(expectedUsersToReceiveNotification) ||
			apnCount != len(expectedUsersToReceiveNotification)
	}, 3*time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

func testDMMessageWithBlockedUser(
	ctx context.Context,
	test *dmChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	// test.member is expected to get a notification but has blocked the sender -> no message
	expectedNotifications := 0

	test.blockUser(
		ctx,
		test.MemberUserSettingsStreamID,
		test.member,
		test.initiator.Address,
		true,
	)

	test.subscribeWebPush(ctx, test.initiator)
	test.subscribeWebPush(ctx, test.member)
	test.subscribeApnPush(ctx, test.initiator)
	test.subscribeApnPush(ctx, test.member)

	// send a message and ensure that all expected notification are captured
	event := test.sendMessageWithTags(
		ctx, test.initiator, "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)

	// ensure that no notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount != expectedNotifications || apnCount != expectedNotifications
	}, time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

func testSpaceChannelNotifications(
	tester *serviceTester,
	notificationClient protocolconnect.NotificationServiceClient,
	authClient protocolconnect.AuthenticationServiceClient,
	notifications *notificationCapture,
) {
	tester.sequentialSubtest("TestPlainMessage", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupSpaceChannelNotificationTest(ctx, tester, notificationClient, authClient)
		testSpaceChannelPlainMessage(ctx, test, notifications)
	})

	tester.sequentialSubtest("TestAtChannelTag", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupSpaceChannelNotificationTest(ctx, tester, notificationClient, authClient)
		testSpaceChannelAtChannelTag(ctx, test, notifications)
	})

	tester.sequentialSubtest("TestMentionsTag", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupSpaceChannelNotificationTest(ctx, tester, notificationClient, authClient)
		testSpaceChannelMentionTag(ctx, test, notifications)
	})

	tester.sequentialSubtest("Settings", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupSpaceChannelNotificationTest(ctx, tester, notificationClient, authClient)
		spaceChannelSettings(ctx, test)
	})

	tester.sequentialSubtest("JoinExistingTown", func(tester *serviceTester) {
		ctx := tester.ctx
		test := setupSpaceChannelNotificationTest(ctx, tester, notificationClient, authClient)
		testJoinExistingTown(ctx, test, notifications)
	})
}

// testSpaceChannelPlainMessage tests space channel message that isn't a reply, reaction nor includes a mention
func testSpaceChannelPlainMessage(
	ctx context.Context,
	test *spaceChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	// by default non of the members should receive a notification for this message
	expectedUsersToReceiveNotification := make(map[common.Address]int)
	for _, wallet := range test.members {
		test.setSpaceChannelSetting(ctx, wallet, SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)

		test.subscribeWebPush(ctx, wallet)
		test.subscribeApnPush(ctx, wallet)
	}

	// enable for some members notifications for this message
	test.setSpaceChannelSetting(
		ctx, test.members[1], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)
	expectedUsersToReceiveNotification[test.members[1].Address] = 1

	test.setSpaceSetting( // per channel setting is no messages -> no notification
		ctx, test.members[2], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)

	test.setSpaceChannelSetting(
		ctx, test.members[3], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS)

	test.setSpaceSetting(
		ctx, test.members[4], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS)

	// send a message and ensure that all expected notification are captured
	event := test.sendMessageWithTags(
		ctx, test.members[0], "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)

	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		webNotifications := nc.WebPushNotifications[eventHash]
		apnNotifications := nc.ApnPushNotifications[eventHash]

		return cmp.Equal(webNotifications, expectedUsersToReceiveNotification) &&
			cmp.Equal(apnNotifications, expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 100*time.Millisecond, "Didn't receive expected notifications for stream %s", test.channelID[:])

	// Wait a bit to ensure that no more notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount != len(expectedUsersToReceiveNotification) ||
			apnCount != len(expectedUsersToReceiveNotification)
	}, time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

func testSpaceChannelAtChannelTag(
	ctx context.Context,
	test *spaceChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	// subscribe for notifications only on the first couple of wallets on both web and apn
	expectedUsersToReceiveNotification := make(map[common.Address]int)
	for _, wallet := range test.members[:10] {
		test.subscribeWebPush(ctx, wallet)
		test.subscribeApnPush(ctx, wallet)
		expectedUsersToReceiveNotification[wallet.Address] = 1
	}

	// user disables all notifications for this channel
	test.setSpaceChannelSetting(
		ctx, test.members[1], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)
	delete(expectedUsersToReceiveNotification, test.members[1].Address)

	// user disables all notification on the space level
	test.setSpaceSetting(
		ctx, test.members[2], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)
	delete(expectedUsersToReceiveNotification, test.members[2].Address)

	// user wants to receive notifications for all messages for this channel
	test.setSpaceChannelSetting(
		ctx, test.members[3], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)
	expectedUsersToReceiveNotification[test.members[3].Address] = 1

	// user wants to receive notifications for all messages on the space level
	test.setSpaceSetting(
		ctx, test.members[4], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)
	expectedUsersToReceiveNotification[test.members[4].Address] = 1

	// user wants to receive notifications for messages that are either a reply/reaction on his own messages
	// or when he is mentioned on the channel level. Because this is the default the space setting is overwritten
	// to no messages to ensure that the channel setting overwrites the space default.
	test.setSpaceSetting(ctx, test.members[5], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)
	test.setSpaceChannelSetting(
		ctx, test.members[5], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS)
	expectedUsersToReceiveNotification[test.members[5].Address] = 1

	// send a message and ensure that all expected notification are captured
	sender := test.members[0] // no notification for your own messages
	delete(expectedUsersToReceiveNotification, sender.Address)
	event := test.sendMessageWithTags(
		ctx, sender, "hi!", &Tags{
			GroupMentionTypes: []GroupMentionType{GroupMentionType_GROUP_MENTION_TYPE_AT_CHANNEL},
		})
	eventHash := common.BytesToHash(event.Hash)

	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		webNotifications := nc.WebPushNotifications[eventHash]
		apnNotifications := nc.ApnPushNotifications[eventHash]

		return cmp.Equal(webNotifications, expectedUsersToReceiveNotification) &&
			cmp.Equal(apnNotifications, expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 100*time.Millisecond, "Didn't receive expected notifications for stream %s", test.channelID[:])

	// Wait a bit to ensure that no more notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount != len(expectedUsersToReceiveNotification) ||
			apnCount != len(expectedUsersToReceiveNotification)
	}, time.Second, 100*time.Millisecond, "Received unexpected notifications")
}

func testSpaceChannelMentionTag(
	ctx context.Context,
	test *spaceChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	// subscribe for notifications only on the first couple of wallets on both web and apn
	expectedUsersToReceiveNotification := make(map[common.Address]struct{})
	var mentionedUsers [][]byte

	for _, wallet := range test.members[:10] {
		test.subscribeWebPush(ctx, wallet)
		test.subscribeApnPush(ctx, wallet)
		expectedUsersToReceiveNotification[wallet.Address] = struct{}{}
		mentionedUsers = append(mentionedUsers, wallet.Address[:])
	}

	// user disables all notifications for this channel
	test.setSpaceChannelSetting(
		ctx, test.members[1], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)
	delete(expectedUsersToReceiveNotification, test.members[1].Address)

	// user disables all notification on the space level
	test.setSpaceSetting(
		ctx, test.members[2], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)
	delete(expectedUsersToReceiveNotification, test.members[2].Address)

	// user wants to receive notifications for all messages for this channel
	test.setSpaceChannelSetting(
		ctx, test.members[3], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)
	expectedUsersToReceiveNotification[test.members[3].Address] = struct{}{}

	// user wants to receive notifications for all messages on the space level
	test.setSpaceSetting(
		ctx, test.members[4], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)
	expectedUsersToReceiveNotification[test.members[4].Address] = struct{}{}

	// user wants to receive notifications for messages that are either a reply/reaction on his own messages
	// or when he is mentioned on the channel level. Because this is the default the space setting is overwritten
	// to no messages to ensure that the channel setting overwrites the space default.
	test.setSpaceSetting(ctx, test.members[5], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)
	test.setSpaceChannelSetting(
		ctx, test.members[5], SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)
	expectedUsersToReceiveNotification[test.members[5].Address] = struct{}{}

	// send a message and ensure that all expected notification are captured
	sender := test.members[0] // no notification for your own messages
	delete(expectedUsersToReceiveNotification, sender.Address)
	event := test.sendMessageWithTags(
		ctx, sender, "hi!", &Tags{
			MentionedUserAddresses: mentionedUsers,
		})
	eventHash := common.BytesToHash(event.Hash)

	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount == len(expectedUsersToReceiveNotification) ||
			apnCount == len(expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 100*time.Millisecond, "Didn't receive expected notifications for stream %s", test.channelID)

	// Wait a bit to ensure that no more notifications come in
	test.req.Never(func() bool {
		nc.WebPushNotificationsMu.Lock()
		webCount := len(nc.WebPushNotifications[eventHash])
		nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		apnCount := len(nc.ApnPushNotifications[eventHash])
		nc.ApnPushNotificationsMu.Unlock()

		return webCount != len(expectedUsersToReceiveNotification) ||
			apnCount != len(expectedUsersToReceiveNotification)
	}, time.Second, 100*time.Millisecond, "Received too unexpected notifications")
}

func initNotificationService(
	ctx context.Context,
	tester *serviceTester,
	notifier push.MessageNotifier,
) *Service {
	var key [32]byte
	_, err := rand.Read(key[:])
	tester.require.NoError(err)

	cfg := tester.getConfig()
	cfg.Notifications.Authentication.SessionToken.Key.Algorithm = "HS256"
	cfg.Notifications.Authentication.SessionToken.Key.Key = hex.EncodeToString(key[:])

	service, err := StartServerInNotificationMode(ctx, cfg, notifier, makeTestServerOpts(tester))
	tester.require.NoError(err)
	tester.cleanup(service.Close)

	return service
}

func setupSpaceChannelNotificationTest(
	ctx context.Context,
	tester *serviceTester,
	notificationClient protocolconnect.NotificationServiceClient,
	authClient protocolconnect.AuthenticationServiceClient,
) *spaceChannelNotificationsTestContext {
	testCtx := &spaceChannelNotificationsTestContext{
		req:                tester.require,
		streamClient:       tester.testClient(0),
		notificationClient: notificationClient,
		authClient:         authClient,
	}

	wallet, _ := crypto.NewWallet(ctx)
	testCtx.members = []*crypto.Wallet{wallet}

	require := tester.require
	client := testCtx.streamClient

	resuser, _, err := createUser(ctx, wallet, client, nil)
	require.NoError(err)
	require.NotNil(resuser)

	_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
	require.NoError(err)

	testCtx.spaceID = testutils.FakeStreamId(STREAM_SPACE_BIN)
	space, _, err := createSpace(ctx, wallet, client, testCtx.spaceID, nil)
	require.NoError(err)
	require.NotNil(space)

	channelID := StreamId{STREAM_CHANNEL_BIN}
	copy(channelID[1:21], testCtx.spaceID[1:21])
	_, err = rand.Read(channelID[21:])
	require.NoError(err)
	testCtx.channelID = channelID
	channel, _, err := createChannel(ctx, wallet, client, testCtx.spaceID, testCtx.channelID, nil)
	require.NoError(err)
	require.NotNil(channel)

	// create users that join the channel
	for i := 0; i < 25; i++ {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err)

		syncCookie, _, err := createUser(ctx, wallet, client, nil)
		require.NoError(err, "error creating user")
		require.NotNil(syncCookie)

		_, _, err = createUserMetadataStream(ctx, wallet, client, nil)
		require.NoError(err)

		addUserToChannel(require, ctx, client, syncCookie, wallet, testCtx.spaceID, testCtx.channelID)

		testCtx.members = append(testCtx.members, wallet)
	}

	newMiniblockRef, err := makeMiniblock(ctx, client, testCtx.channelID, false, 0)
	require.NoError(err)
	require.Greater(newMiniblockRef.Num, int64(0))

	return testCtx
}

type dmChannelNotificationsTestContext struct {
	req                           *require.Assertions
	initiator                     *crypto.Wallet
	InitiatorUserSettingsStreamID StreamId
	member                        *crypto.Wallet
	MemberUserSettingsStreamID    StreamId
	dmStreamID                    StreamId
	Channel                       *SyncCookie
	streamClient                  protocolconnect.StreamServiceClient
	notificationClient            protocolconnect.NotificationServiceClient
	authClient                    protocolconnect.AuthenticationServiceClient
}

func setupDMNotificationTest(
	ctx context.Context,
	tester *serviceTester,
	notificationClient protocolconnect.NotificationServiceClient,
	authClient protocolconnect.AuthenticationServiceClient,
) *dmChannelNotificationsTestContext {
	testCtx := &dmChannelNotificationsTestContext{
		req:                tester.require,
		streamClient:       tester.testClient(0),
		notificationClient: notificationClient,
		authClient:         authClient,
	}

	require := tester.require
	client := testCtx.streamClient
	var err error

	testCtx.initiator, err = crypto.NewWallet(ctx)
	require.NoError(err)

	testCtx.InitiatorUserSettingsStreamID, _, _, err = createUserSettingsStream(
		ctx,
		testCtx.initiator,
		testCtx.streamClient,
		nil,
	)
	require.NoError(err)

	user1SyncCookie, _, err := createUser(ctx, testCtx.initiator, client, nil)
	require.NoError(err)
	require.NotNil(user1SyncCookie)

	_, _, err = createUserMetadataStream(ctx, testCtx.initiator, client, nil)
	require.NoError(err)

	testCtx.member, err = crypto.NewWallet(ctx)
	require.NoError(err)

	user2SyncCookie, _, err := createUser(ctx, testCtx.member, client, nil)
	require.NoError(err)
	require.NotNil(user2SyncCookie)

	testCtx.MemberUserSettingsStreamID, _, _, err = createUserSettingsStream(
		ctx,
		testCtx.member,
		testCtx.streamClient,
		nil,
	)
	require.NoError(err)

	_, _, err = createUserMetadataStream(ctx, testCtx.member, client, nil)
	require.NoError(err)

	testCtx.dmStreamID, err = DMStreamIdForUsers(testCtx.initiator.Address[:], testCtx.member.Address[:])
	require.NoError(err)
	testCtx.Channel, _, err = createDMChannel(ctx, testCtx.initiator, testCtx.member, client, testCtx.dmStreamID, nil)
	require.NoError(err)
	require.NotNil(testCtx.Channel)

	return testCtx
}

type gdmChannelNotificationsTestContext struct {
	req                *require.Assertions
	members            []*crypto.Wallet
	gdmStreamID        StreamId
	streamClient       protocolconnect.StreamServiceClient
	notificationClient protocolconnect.NotificationServiceClient
	authClient         protocolconnect.AuthenticationServiceClient
	tester             *serviceTester
}

func setupGDMNotificationTest(
	ctx context.Context,
	tester *serviceTester,
	notificationClient protocolconnect.NotificationServiceClient,
	authClient protocolconnect.AuthenticationServiceClient,
) *gdmChannelNotificationsTestContext {
	testCtx := &gdmChannelNotificationsTestContext{
		req:                tester.require,
		streamClient:       tester.testClient(0),
		notificationClient: notificationClient,
		authClient:         authClient,
		tester:             tester,
	}

	require := tester.require
	client := testCtx.streamClient
	var err error

	for i := 0; i < 10; i++ {
		member, err := crypto.NewWallet(ctx)
		require.NoError(err)

		_, _, _, err = createUserSettingsStream(
			ctx,
			member,
			testCtx.streamClient,
			nil,
		)
		require.NoError(err)

		_, _, err = createUser(ctx, member, client, nil)
		require.NoError(err)

		_, _, err = createUserMetadataStream(ctx, member, client, nil)
		require.NoError(err)

		testCtx.members = append(testCtx.members, member)
	}

	testCtx.gdmStreamID = testutils.FakeStreamId(STREAM_GDM_CHANNEL_BIN)
	_, _, err = createGDMChannel(
		ctx,
		testCtx.members[0],
		testCtx.members[1:],
		testCtx.streamClient,
		testCtx.gdmStreamID,
		nil,
	)

	testCtx.req.NoError(err)

	return testCtx
}

func (tc *gdmChannelNotificationsTestContext) sendMessageWithTags(
	ctx context.Context,
	from *crypto.Wallet,
	messageContent string,
	tags *Tags,
) *Envelope {
	resp, err := tc.streamClient.GetLastMiniblockHash(ctx, connect.NewRequest(
		&GetLastMiniblockHashRequest{
			StreamId: tc.gdmStreamID[:],
		}))
	tc.req.NoError(err)

	event, err := events.MakeEnvelopeWithPayloadAndTags(
		from,
		events.Make_GDMChannelPayload_Message(messageContent),
		&MiniblockRef{
			Num:  resp.Msg.GetMiniblockNum(),
			Hash: common.BytesToHash(resp.Msg.GetHash()),
		},
		tags,
	)
	tc.req.NoError(err)

	_, err = tc.streamClient.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
		StreamId: tc.gdmStreamID[:],
		Event:    event,
		Optional: false,
	}))

	tc.req.NoError(err)

	return event
}

func (tc *gdmChannelNotificationsTestContext) sendTip(
	ctx context.Context,
	from *crypto.Wallet,
	to *crypto.Wallet,
	messageId []byte,
) *EventRef {
	userStreamId, err := UserStreamIdFromBytes(from.Address[:])
	tc.req.NoError(err)

	resp, err := tc.streamClient.GetLastMiniblockHash(ctx, connect.NewRequest(
		&GetLastMiniblockHashRequest{
			StreamId: userStreamId[:],
		}))
	tc.req.NoError(err)
	amount := big.NewInt(100)
	tokenId := big.NewInt(12345)
	currency := common.HexToAddress("0x2222222222222222222222222222222222222222")
	event, err := events.MakeEnvelopeWithPayloadAndTags(
		from,
		events.Make_UserPayload_BlockchainTransaction(from.Address[:], &BlockchainTransaction{
			// a very incomplete receipt
			Receipt: makeTipReceipt(ctx, from, to, messageId, tc.gdmStreamID[:], amount, tokenId, currency),
			Content: &BlockchainTransaction_Tip_{
				Tip: &BlockchainTransaction_Tip{
					Event: &BlockchainTransaction_Tip_Event{
						MessageId: messageId,
						Amount:    amount.Uint64(),
						TokenId:   tokenId.Uint64(),
						Currency:  currency.Bytes(),
						Sender:    from.Address[:],
						Receiver:  to.Address[:],
						ChannelId: tc.gdmStreamID[:],
					},
					ToUserAddress: to.Address[:],
				},
			},
		}),
		&MiniblockRef{
			Num:  resp.Msg.GetMiniblockNum(),
			Hash: common.BytesToHash(resp.Msg.GetHash()),
		},
		&Tags{
			MessageInteractionType:     MessageInteractionType_MESSAGE_INTERACTION_TYPE_TIP,
			ParticipatingUserAddresses: [][]byte{to.Address[:]},
			ThreadId:                   messageId,
		},
	)
	tc.req.NoError(err)

	aresp, err := tc.streamClient.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
		StreamId: userStreamId[:],
		Event:    event,
		Optional: false,
	}))

	tc.req.NoError(err)

	for _, eventRef := range aresp.Msg.NewEvents {
		if bytes.Equal(eventRef.StreamId, tc.gdmStreamID[:]) {
			return eventRef
		}
	}

	return nil
}

func makeTipReceipt(
	ctx context.Context,
	from *crypto.Wallet,
	to *crypto.Wallet,
	messageId []byte,
	channelId []byte,
	amount *big.Int,
	tokenId *big.Int,
	currency common.Address,
) *BlockchainTransactionReceipt {
	eventSig := []byte("Tip(uint256,address,address,address,uint256,bytes32,bytes32)")
	eventSigHash := eth_crypto.Keccak256Hash(eventSig)

	// 2. Suppose we want to simulate the following sample values:
	sender := from.Address
	receiver := to.Address

	// 3. Construct the topics:
	//    topics[0] = event signature hash
	//    topics[1] = indexed tokenId (as a 256-bit value)
	//    topics[2] = indexed currency (as a 256-bit value, left-padded)
	topics := [][]byte{
		eventSigHash[:],                   // the event signature
		common.BigToHash(tokenId).Bytes(), // tokenId
		common.BytesToHash(common.LeftPadBytes(currency.Bytes(), 32)).Bytes(), // currency
	}

	// 4. Construct the data portion (non-indexed params in order).
	//
	//    The Solidity layout is:
	//    1) address sender   (32 bytes)
	//    2) address receiver (32 bytes)
	//    3) uint256 amount   (32 bytes)
	//    4) bytes32 messageId
	//    5) bytes32 channelId
	//
	//    Each is left-padded to 32 bytes (except bytes32 which is already 32).
	data := []byte{}
	data = append(data, common.LeftPadBytes(sender.Bytes(), 32)...)   // sender
	data = append(data, common.LeftPadBytes(receiver.Bytes(), 32)...) // receiver
	data = append(data, common.LeftPadBytes(amount.Bytes(), 32)...)   // amount
	data = append(data, messageId[:]...)                              // messageId
	data = append(data, channelId[:]...)                              // channelId

	// 5. Construct the Log
	//    (Address is the contract address that emitted the event; choose an example)
	log := BlockchainTransactionReceipt_Log{
		Address: common.HexToAddress("0x1234567890abcdef1234567890abcdef12345678").Bytes(),
		Topics:  topics,
		Data:    data,
	}

	return &BlockchainTransactionReceipt{
		ChainId:         1,
		TransactionHash: eventSigHash[:],
		BlockNumber:     100,
		To:              from.Address[:],
		From:            to.Address[:],
		Logs:            []*BlockchainTransactionReceipt_Log{&log},
	}
}

func (tc *gdmChannelNotificationsTestContext) setGlobalGDMSetting(
	ctx context.Context,
	user *crypto.Wallet,
	setting GdmChannelSettingValue,
) {
	req := connect.NewRequest(&SetDmGdmSettingsRequest{
		DmGlobal:  DmChannelSettingValue_DM_MESSAGES_YES,
		GdmGlobal: setting,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, req)

	_, err := tc.notificationClient.SetDmGdmSettings(ctx, req)

	tc.req.NoError(err, "setGlobalGDMSetting failed")
}

func (tc *gdmChannelNotificationsTestContext) setGDMChannelSetting(
	ctx context.Context,
	user *crypto.Wallet,
	setting GdmChannelSettingValue,
) {
	request := connect.NewRequest(&SetGdmChannelSettingRequest{
		GdmChannelId: tc.gdmStreamID[:],
		Value:        setting,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SetGdmChannelSetting(ctx, request)

	tc.req.NoError(err, "setGDMChannelSetting failed")
}

func (tc *gdmChannelNotificationsTestContext) subscribeWebPush(
	ctx context.Context,
	user *crypto.Wallet,
) {
	userID := user.Address

	h := sha256.New()
	h.Write(userID[:])
	p256Dh := hex.EncodeToString(h.Sum(nil))
	h.Write(userID[:])
	auth := hex.EncodeToString(h.Sum(nil))

	request := connect.NewRequest(&SubscribeWebPushRequest{
		Subscription: &WebPushSubscriptionObject{
			Endpoint: userID.String(), // (ab)used to determine who received a notification
			Keys: &WebPushSubscriptionObjectKeys{
				P256Dh: p256Dh,
				Auth:   auth,
			},
		},
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SubscribeWebPush(ctx, request)

	tc.req.NoError(err, "SubscribeWebPush failed")
}

func (tc *gdmChannelNotificationsTestContext) subscribeApnPush(
	ctx context.Context,
	user *crypto.Wallet,
) {
	request := connect.NewRequest(&SubscribeAPNRequest{
		DeviceToken: user.Address[:], // (ab)used to determine who received a notification
		Environment: APNEnvironment_APN_ENVIRONMENT_SANDBOX,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)
	_, err := tc.notificationClient.SubscribeAPN(ctx, request)

	tc.req.NoError(err, "SubscribeAPN failed")
}

func (tc *gdmChannelNotificationsTestContext) unsubscribeApnPush(
	ctx context.Context,
	user *crypto.Wallet,
) {
	request := connect.NewRequest(&UnsubscribeAPNRequest{
		DeviceToken: user.Address[:], // (ab)used to determine who received a notification
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)
	_, err := tc.notificationClient.UnsubscribeAPN(ctx, request)

	tc.req.NoError(err, "UnsubscribeAPN failed")
}

func (tc *dmChannelNotificationsTestContext) sendMessageWithTags(
	ctx context.Context,
	from *crypto.Wallet,
	messageContent string,
	tags *Tags,
) *Envelope {
	resp, err := tc.streamClient.GetLastMiniblockHash(ctx, connect.NewRequest(
		&GetLastMiniblockHashRequest{
			StreamId: tc.dmStreamID[:],
		}))
	tc.req.NoError(err)

	event, err := events.MakeEnvelopeWithPayloadAndTags(
		from,
		events.Make_DMChannelPayload_Message(messageContent),
		&MiniblockRef{
			Num:  resp.Msg.GetMiniblockNum(),
			Hash: common.BytesToHash(resp.Msg.GetHash()),
		},
		tags,
	)
	tc.req.NoError(err)

	_, err = tc.streamClient.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
		StreamId: tc.dmStreamID[:],
		Event:    event,
		Optional: false,
	}))

	tc.req.NoError(err)

	return event
}

func (tc *dmChannelNotificationsTestContext) blockUser(
	ctx context.Context,
	streamID StreamId,
	from *crypto.Wallet,
	userID common.Address,
	blocked bool,
) *Envelope {
	resp, err := tc.streamClient.GetLastMiniblockHash(ctx, connect.NewRequest(
		&GetLastMiniblockHashRequest{
			StreamId: streamID[:],
		}))
	tc.req.NoError(err)

	event, err := events.MakeEnvelopeWithPayload(
		from,
		events.Make_UserSettingsPayload_UserBlock(&UserSettingsPayload_UserBlock{
			UserId:    userID[:],
			IsBlocked: blocked,
			EventNum:  22,
		}),
		&MiniblockRef{
			Hash: common.BytesToHash(resp.Msg.GetHash()),
			Num:  resp.Msg.GetMiniblockNum(),
		},
	)
	tc.req.NoError(err)

	_, err = tc.streamClient.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
		StreamId: streamID[:],
		Event:    event,
		Optional: false,
	}))

	tc.req.NoError(err)

	return event
}

func (tc *dmChannelNotificationsTestContext) setChannel(
	ctx context.Context,
	user *crypto.Wallet,
	setting DmChannelSettingValue,
) {
	request := connect.NewRequest(&SetDmChannelSettingRequest{
		DmChannelId: tc.dmStreamID[:],
		Value:       setting,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SetDmChannelSetting(ctx, request)

	tc.req.NoError(err, "setChannel failed")
}

func (tc *dmChannelNotificationsTestContext) muteGlobal(
	ctx context.Context,
	user *crypto.Wallet,
	setting DmChannelSettingValue,
) {
	request := connect.NewRequest(&SetDmGdmSettingsRequest{
		DmGlobal:  setting,
		GdmGlobal: GdmChannelSettingValue_GDM_UNSPECIFIED,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SetDmGdmSettings(ctx, request)

	tc.req.NoError(err, "muteGlobal failed")
}

func (tc *dmChannelNotificationsTestContext) subscribeWebPush(
	ctx context.Context,
	user *crypto.Wallet,
) {
	userID := user.Address
	h := sha256.New()
	h.Write(userID[:])
	p256Dh := hex.EncodeToString(h.Sum(nil))
	h.Write(userID[:])
	auth := hex.EncodeToString(h.Sum(nil))

	endpoint := userID.String() // (ab)used to determine who received a notification

	request := connect.NewRequest(&SubscribeWebPushRequest{
		Subscription: &WebPushSubscriptionObject{
			Endpoint: endpoint,
			Keys: &WebPushSubscriptionObjectKeys{
				P256Dh: p256Dh,
				Auth:   auth,
			},
		},
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SubscribeWebPush(ctx, request)

	tc.req.NoError(err, "SubscribeWebPush failed")
}

func (tc *dmChannelNotificationsTestContext) subscribeApnPush(
	ctx context.Context,
	user *crypto.Wallet,
) {
	request := connect.NewRequest(&SubscribeAPNRequest{
		DeviceToken: user.Address[:], // (ab)used to determine who received a notification
		Environment: APNEnvironment_APN_ENVIRONMENT_SANDBOX,
		PushVersion: NotificationPushVersion_NOTIFICATION_PUSH_VERSION_2,
	})
	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SubscribeAPN(ctx, request)

	tc.req.NoError(err, "SubscribeAPN failed")
}

type spaceChannelNotificationsTestContext struct {
	req                *require.Assertions
	members            []*crypto.Wallet
	spaceID            StreamId
	channelID          StreamId
	streamClient       protocolconnect.StreamServiceClient
	notificationClient protocolconnect.NotificationServiceClient
	authClient         protocolconnect.AuthenticationServiceClient
}

func (tc *spaceChannelNotificationsTestContext) sendMessageWithTags(
	ctx context.Context,
	from *crypto.Wallet,
	messageContent string,
	tags *Tags,
) *Envelope {
	resp, err := tc.streamClient.GetLastMiniblockHash(ctx, connect.NewRequest(
		&GetLastMiniblockHashRequest{
			StreamId: tc.channelID[:],
		}))
	tc.req.NoError(err)

	event, err := events.MakeEnvelopeWithPayloadAndTags(
		from,
		events.Make_ChannelPayload_Message(messageContent),
		&MiniblockRef{
			Num:  resp.Msg.GetMiniblockNum(),
			Hash: common.BytesToHash(resp.Msg.GetHash()),
		},
		tags,
	)
	tc.req.NoError(err)

	_, err = tc.streamClient.AddEvent(ctx, connect.NewRequest(&AddEventRequest{
		StreamId: tc.channelID[:],
		Event:    event,
		Optional: false,
	}))

	tc.req.NoError(err)

	return event
}

func (tc *spaceChannelNotificationsTestContext) subscribeWebPush(
	ctx context.Context,
	user *crypto.Wallet,
) {
	userID := user.Address

	h := sha256.New()
	h.Write(userID[:])
	p256Dh := hex.EncodeToString(h.Sum(nil))
	h.Write(userID[:])
	auth := hex.EncodeToString(h.Sum(nil))

	request := connect.NewRequest(&SubscribeWebPushRequest{
		Subscription: &WebPushSubscriptionObject{
			Endpoint: userID.String(), // (ab)used to determine who received a notification
			Keys: &WebPushSubscriptionObjectKeys{
				P256Dh: p256Dh,
				Auth:   auth,
			},
		},
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)
	_, err := tc.notificationClient.SubscribeWebPush(ctx, request)

	tc.req.NoError(err, "SubscribeWebPush failed")
}

func (tc *spaceChannelNotificationsTestContext) subscribeApnPush(
	ctx context.Context,
	user *crypto.Wallet,
) {
	request := connect.NewRequest(&SubscribeAPNRequest{
		DeviceToken: user.Address[:], // (ab)used to determine who received a notification
		Environment: APNEnvironment_APN_ENVIRONMENT_SANDBOX,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SubscribeAPN(ctx, request)

	tc.req.NoError(err, "SubscribeAPN failed")
}

func (tc *spaceChannelNotificationsTestContext) setSpaceChannelSetting(
	ctx context.Context,
	user *crypto.Wallet,
	setting SpaceChannelSettingValue,
) {
	request := connect.NewRequest(&SetSpaceChannelSettingsRequest{
		ChannelId: tc.channelID[:],
		SpaceId:   tc.spaceID[:],
		Value:     setting,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SetSpaceChannelSettings(ctx, request)

	tc.req.NoError(err, "SetChannelSettings failed")
}

func (tc *spaceChannelNotificationsTestContext) setSpaceSetting(
	ctx context.Context,
	user *crypto.Wallet,
	setting SpaceChannelSettingValue,
) {
	request := connect.NewRequest(&SetSpaceSettingsRequest{
		SpaceId: tc.spaceID[:],
		Value:   setting,
	})

	authenticateNS(ctx, tc.req, tc.authClient, user, request)

	_, err := tc.notificationClient.SetSpaceSettings(ctx, request)

	tc.req.NoError(err, "SetSpaceSettings failed")
}

type notificationCapture struct {
	WebPushNotificationsMu sync.Mutex
	WebPushNotifications   map[common.Hash]map[common.Address]int // event hash -> key=endpoint:count
	ApnPushNotificationsMu sync.Mutex
	ApnPushNotifications   map[common.Hash]map[common.Address]int // event hash -> key=device_token:count
}

func (nc *notificationCapture) SendWebPushNotification(
	_ context.Context,
	subscription *webpush.Subscription,
	eventHash common.Hash,
	_ []byte,
) (bool, error) {
	nc.WebPushNotificationsMu.Lock()
	defer nc.WebPushNotificationsMu.Unlock()

	events, found := nc.WebPushNotifications[eventHash]
	if !found {
		events = make(map[common.Address]int)
	}

	// for testing purposes the users address is included in the endpoint
	events[common.HexToAddress(subscription.Endpoint)]++
	nc.WebPushNotifications[eventHash] = events

	return false, nil
}

func (nc *notificationCapture) SendApplePushNotification(
	_ context.Context,
	sub *types.APNPushSubscription,
	eventHash common.Hash,
	_ *payload2.Payload,
	_ bool,
) (bool, int, error) {
	nc.ApnPushNotificationsMu.Lock()
	defer nc.ApnPushNotificationsMu.Unlock()

	events, found := nc.ApnPushNotifications[eventHash]
	if !found {
		events = make(map[common.Address]int)
	}

	// for test purposes the users address is the device token
	events[common.BytesToAddress(sub.DeviceToken)]++
	nc.ApnPushNotifications[eventHash] = events

	return false, http.StatusOK, nil
}

func spaceChannelSettings(
	ctx context.Context,
	test *spaceChannelNotificationsTestContext,
) {
	user := test.members[0]

	// create second channel in test space
	channel2ID := StreamId{STREAM_CHANNEL_BIN}
	copy(channel2ID[1:21], test.spaceID[1:21])
	_, err := rand.Read(channel2ID[21:])
	test.req.NoError(err)
	channel, _, err := createChannel(ctx, user, test.streamClient, test.spaceID, channel2ID, nil)
	test.req.NoError(err)
	test.req.NotNil(channel)

	request1 := connect.NewRequest(&GetSettingsRequest{})
	authenticateNS(ctx, test.req, test.authClient, user, request1)

	// ensure that the initial settings are correct
	initialSettingsResp, err := test.notificationClient.GetSettings(ctx, request1)
	test.req.NoError(err, "GetSettings failed")

	initialSettings := initialSettingsResp.Msg

	test.req.Equal(initialSettings.GetUserId(), user.Address[:])
	test.req.Equal(initialSettings.GetDmGlobal(), DmChannelSettingValue_DM_MESSAGES_YES)
	test.req.Equal(initialSettings.GetGdmGlobal(), GdmChannelSettingValue_GDM_MESSAGES_ALL)

	test.req.Empty(initialSettings.GetDmChannels())
	test.req.Empty(initialSettings.GetGdmChannels())

	test.req.Empty(initialSettings.GetWebSubscriptions())
	test.req.Empty(initialSettings.GetApnSubscriptions())

	test.req.Empty(initialSettings.GetSpace())

	// set settings on the space and both space channels and ensure that all are stored
	request2 := connect.NewRequest(&SetSpaceChannelSettingsRequest{
		ChannelId: test.channelID[:],
		SpaceId:   test.spaceID[:],
		Value:     SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL,
	})
	authenticateNS(ctx, test.req, test.authClient, user, request2)

	_, err = test.notificationClient.SetSpaceChannelSettings(ctx, request2)
	test.req.NoError(err, "SetSpaceChannelSettings failed")

	request3 := connect.NewRequest(&SetSpaceChannelSettingsRequest{
		ChannelId: channel2ID[:],
		SpaceId:   test.spaceID[:],
		Value:     SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES,
	})
	authenticateNS(ctx, test.req, test.authClient, user, request3)

	_, err = test.notificationClient.SetSpaceChannelSettings(ctx, request3)
	test.req.NoError(err, "SetSpaceChannelSettings failed")

	request4 := connect.NewRequest(&SetSpaceSettingsRequest{
		SpaceId: test.spaceID[:],
		Value:   SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES,
	})

	authenticateNS(ctx, test.req, test.authClient, user, request4)

	_, err = test.notificationClient.SetSpaceSettings(ctx, request4)
	test.req.NoError(err, "SetSpaceSettings failed")

	// ensure that the settings are correct applied
	settingsResp, err := test.notificationClient.GetSettings(ctx, request1)
	test.req.NoError(err, "GetSettings failed")

	settings := settingsResp.Msg

	test.req.Equal(settings.GetUserId(), user.Address[:])
	test.req.Equal(settings.GetDmGlobal(), DmChannelSettingValue_DM_MESSAGES_YES)
	test.req.Equal(settings.GetGdmGlobal(), GdmChannelSettingValue_GDM_MESSAGES_ALL)

	test.req.Empty(settings.GetDmChannels())
	test.req.Empty(settings.GetGdmChannels())

	test.req.Empty(settings.GetWebSubscriptions())
	test.req.Empty(settings.GetApnSubscriptions())

	test.req.Equal(1, len(settings.GetSpace()))
	space := settings.GetSpace()[0]
	test.req.Equal(space.Value, SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_NO_MESSAGES)
	test.req.Equal(2, len(space.Channels))

	channel1 := space.Channels[0]
	channel2 := space.Channels[1]
	if bytes.Equal(channel1.ChannelId, channel2ID[:]) {
		channel1, channel2 = channel2, channel1
	}

	test.req.Equal(request2.Msg.ChannelId, channel1.ChannelId)
	test.req.Equal(request2.Msg.Value, channel1.Value)

	test.req.Equal(request3.Msg.ChannelId, channel2.ChannelId)
	test.req.Equal(request3.Msg.Value, channel2.Value)

	request5 := connect.NewRequest(&SetSpaceChannelSettingsRequest{
		ChannelId: channel2ID[:],
		SpaceId:   test.spaceID[:],
		Value:     SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_UNSPECIFIED,
	})
	authenticateNS(ctx, test.req, test.authClient, user, request5)

	_, err = test.notificationClient.SetSpaceChannelSettings(ctx, request5)
	test.req.NoError(err, "SetSpaceChannelSettings failed")

	authenticateNS(ctx, test.req, test.authClient, user, request4)

	_, err = test.notificationClient.SetSpaceSettings(ctx, request4)
	test.req.NoError(err, "SetSpaceSettings failed")

	// ensure that the settings are correct applied
	settingsResp, err = test.notificationClient.GetSettings(ctx, request1)
	test.req.NoError(err, "GetSettings failed")

	settings = settingsResp.Msg

	space = settings.GetSpace()[0]
	// channel2 should have been removed, only channel1 should be left
	test.req.Equal(1, len(space.Channels))
	// channel1 is the one that was set to messages all, make sure it's still there
	test.req.Equal(space.Channels[0].ChannelId, channel1.ChannelId)
	test.req.Equal(space.Channels[0].Value, SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)
}

// testJoinExistingTown tests that notifications are received when a user joins a town.
func testJoinExistingTown(
	ctx context.Context,
	test *spaceChannelNotificationsTestContext,
	nc *notificationCapture,
) {
	// create new users that joins the channel and subscribe for APN and WEB notifications
	userNewlyJoined, err := crypto.NewWallet(ctx)
	test.req.NoError(err)

	test.subscribeApnPush(ctx, userNewlyJoined)
	test.subscribeWebPush(ctx, userNewlyJoined)
	test.setSpaceChannelSetting(ctx, userNewlyJoined, SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL)

	syncCookie, _, err := createUser(ctx, userNewlyJoined, test.streamClient, nil)
	test.req.NoError(err, "error creating user")
	test.req.NotNil(syncCookie)

	_, _, err = createUserMetadataStream(ctx, userNewlyJoined, test.streamClient, nil)
	test.req.NoError(err)

	addUserToChannel(test.req, ctx, test.streamClient, syncCookie, userNewlyJoined, test.spaceID, test.channelID)

	newMiniblockRef, err := makeMiniblock(ctx, test.streamClient, test.channelID, false, 0)
	test.req.NoError(err)
	test.req.Greater(newMiniblockRef.Num, int64(0))

	sender := test.members[0]
	event := test.sendMessageWithTags(ctx, sender, "hi!", &Tags{})
	eventHash := common.BytesToHash(event.Hash)
	expectedUsersToReceiveNotification := map[common.Address]int{userNewlyJoined.Address: 1}

	test.req.Eventuallyf(func() bool {
		nc.WebPushNotificationsMu.Lock()
		defer nc.WebPushNotificationsMu.Unlock()

		nc.ApnPushNotificationsMu.Lock()
		defer nc.ApnPushNotificationsMu.Unlock()

		webNotifications := nc.WebPushNotifications[eventHash]
		apnNotifications := nc.ApnPushNotifications[eventHash]

		return cmp.Equal(webNotifications, expectedUsersToReceiveNotification) &&
			cmp.Equal(apnNotifications, expectedUsersToReceiveNotification)
	}, notificationDeliveryDelay, 100*time.Millisecond, "Didn't receive expected notifications for stream %s", test.channelID)
}
