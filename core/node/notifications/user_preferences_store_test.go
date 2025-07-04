package notifications_test

import (
	"context"
	"crypto/rand"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/notifications/types"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/stretchr/testify/require"
)

func prepareNotificationsDB(ctx context.Context) (*storage.PostgresNotificationStore, func()) {
	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	if err != nil {
		panic(err)
	}

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	pool, err := storage.CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	if err != nil {
		panic(err)
	}

	exitSignal := make(chan error, 1)
	store, err := storage.NewPostgresNotificationStore(
		ctx,
		pool,
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
	)
	if err != nil {
		panic(err)
	}

	return store, dbCloser
}

func TestUserPreferencesStore(t *testing.T) {
	var (
		req            = require.New(t)
		ctx, ctxCloser = test.NewTestContext()
	)
	defer ctxCloser()

	store, dbCloser := prepareNotificationsDB(ctx)
	defer dbCloser()

	t.Parallel()

	t.Run("userPreferencesNotExists", func(t *testing.T) {
		userPreferencesNotExists(req, ctx, store)
	})
	t.Run("setAndRetrieveUserPreferences", func(t *testing.T) {
		setAndRetrieveUserPreferences(req, ctx, store)
	})
	t.Run("subscribeWebPush", func(t *testing.T) {
		subscribeWebPush(req, ctx, store)
	})
	t.Run("subscribeAPN", func(t *testing.T) {
		subscribeAPN(req, ctx, store)
	})
	t.Run("webPushExpired", func(t *testing.T) {
		webPushExpired(req, ctx, store)
	})
}

func userPreferencesNotExists(req *require.Assertions, ctx context.Context, store *storage.PostgresNotificationStore) {
	wallet, err := crypto.NewWallet(ctx)
	req.NoError(err)

	preferences, err := store.GetUserPreferences(ctx, wallet.Address)
	req.NoError(err)

	req.Equal(wallet.Address, preferences.UserID)
	req.Equal(preferences.DM, DmChannelSettingValue_DM_MESSAGES_YES)
	req.Equal(preferences.GDM, GdmChannelSettingValue_GDM_MESSAGES_ALL)
	req.Empty(preferences.DMChannels)
	req.Empty(preferences.GDMChannels)
	req.Empty(preferences.Subscriptions.WebPush)
	req.Empty(preferences.Subscriptions.APNPush)
}

func setAndRetrieveUserPreferences(
	req *require.Assertions,
	ctx context.Context,
	store *storage.PostgresNotificationStore,
) {
	wallet, err := crypto.NewWallet(ctx)
	req.NoError(err)

	expected := &types.UserPreferences{
		UserID:      wallet.Address,
		DM:          DmChannelSettingValue_DM_MESSAGES_NO,
		GDM:         GdmChannelSettingValue_GDM_ONLY_MENTIONS_REPLIES_REACTIONS,
		Spaces:      make(types.SpacesMap),
		DMChannels:  make(types.DMChannelsMap),
		GDMChannels: make(types.GDMChannelsMap),
		Subscriptions: types.Subscriptions{
			WebPush: []*types.WebPushSubscription{
				{
					Sub: &webpush.Subscription{
						Endpoint: "https://test.test.1",
						Keys: webpush.Keys{
							Auth:   "test.auth.1",
							P256dh: "p256dh.test.1",
						},
					},
					LastSeen: time.Now(),
				},
			},
			APNPush: []*types.APNPushSubscription{
				{
					DeviceToken: []byte{0, 1, 2, 3, 4},
					LastSeen:    time.Now(),
					Environment: APNEnvironment_APN_ENVIRONMENT_SANDBOX,
					PushVersion: NotificationPushVersion_NOTIFICATION_PUSH_VERSION_2,
				},
			},
		},
	}

	for i := 0; i < 1; i++ {
		var spaceID shared.StreamId
		spaceID[0] = shared.STREAM_SPACE_BIN
		_, err = rand.Read(spaceID[1:21])
		req.NoError(err)

		space := &types.SpacePreferences{
			Setting:  SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_ONLY_MENTIONS_REPLIES_REACTIONS,
			Channels: make(map[shared.StreamId]SpaceChannelSettingValue),
		}

		for c := 0; c < 3; c++ {
			var channelID shared.StreamId
			switch c % 3 {
			case 0:
				channelID[0] = shared.STREAM_DM_CHANNEL_BIN
				_, err = rand.Read(channelID[1:])
				req.NoError(err)
				expected.DMChannels[channelID] = DmChannelSettingValue_DM_MESSAGES_YES
			case 1:
				channelID[0] = shared.STREAM_GDM_CHANNEL_BIN
				_, err = rand.Read(channelID[1:])
				req.NoError(err)
				expected.GDMChannels[channelID] = GdmChannelSettingValue_GDM_MESSAGES_ALL
			case 2:
				channelID[0] = shared.STREAM_CHANNEL_BIN
				copy(channelID[1:21], spaceID[1:])
				_, err = rand.Read(channelID[21:])
				req.NoError(err)
				space.Channels[channelID] = SpaceChannelSettingValue_SPACE_CHANNEL_SETTING_MESSAGES_ALL
			}
		}

		expected.Spaces[spaceID] = space
	}

	req.NoError(store.SetUserPreferences(ctx, expected))

	for _, webSub := range expected.Subscriptions.WebPush {
		req.NoError(store.AddWebPushSubscription(ctx, expected.UserID, webSub.Sub))
	}
	for _, apnSub := range expected.Subscriptions.APNPush {
		req.NoError(
			store.AddAPNSubscription(ctx, expected.UserID, apnSub.DeviceToken,
				APNEnvironment_APN_ENVIRONMENT_SANDBOX, NotificationPushVersion_NOTIFICATION_PUSH_VERSION_2),
		)
	}

	got, err := store.GetUserPreferences(ctx, expected.UserID)
	req.NoError(err)

	// lastSeen is updated when the sub was added
	expected.Subscriptions.WebPush[0].LastSeen = got.Subscriptions.WebPush[0].LastSeen
	expected.Subscriptions.APNPush[0].LastSeen = got.Subscriptions.APNPush[0].LastSeen

	req.Equal(expected, got)
}

func subscribeWebPush(req *require.Assertions, ctx context.Context, store *storage.PostgresNotificationStore) {
	wallet, err := crypto.NewWallet(ctx)
	req.NoError(err)

	exp1 := webpush.Subscription{
		Endpoint: fmt.Sprintf("https://%s.local.1", wallet.Address),
		Keys: webpush.Keys{
			Auth:   "test.auth.1",
			P256dh: "p256dh.test.1",
		},
	}

	exp2 := webpush.Subscription{
		Endpoint: fmt.Sprintf("https://%s.local.2", wallet.Address),
		Keys: webpush.Keys{
			Auth:   "test.auth.2",
			P256dh: "p256dh.test.2",
		},
	}

	err = store.AddWebPushSubscription(ctx, wallet.Address, &exp1)
	req.NoError(err)
	err = store.AddWebPushSubscription(ctx, wallet.Address, &exp2)
	req.NoError(err)

	got, err := store.GetWebPushSubscriptions(ctx, wallet.Address)
	req.NoError(err)

	req.Equal(2, len(got))
	if exp1.Endpoint == got[0].Sub.Endpoint {
		req.Equal(exp1, *got[0].Sub)
	} else {
		req.Equal(exp1, *got[1].Sub)
	}
	if exp2.Endpoint == got[0].Sub.Endpoint {
		req.Equal(exp2, *got[0].Sub)
	} else {
		req.Equal(exp2, *got[1].Sub)
	}
}

func subscribeAPN(req *require.Assertions, ctx context.Context, store *storage.PostgresNotificationStore) {
	wallet, err := crypto.NewWallet(ctx)
	req.NoError(err)

	var (
		deviceToken1 [64]byte
		env1         = APNEnvironment_APN_ENVIRONMENT_SANDBOX
		deviceToken2 [64]byte
		env2         = APNEnvironment_APN_ENVIRONMENT_PRODUCTION
	)

	_, err = rand.Read(deviceToken1[:])
	req.NoError(err)

	_, err = rand.Read(deviceToken2[:])
	req.NoError(err)

	req.NoError(store.AddAPNSubscription(ctx, wallet.Address, deviceToken1[:], env1, NotificationPushVersion_NOTIFICATION_PUSH_VERSION_2))
	req.NoError(store.AddAPNSubscription(ctx, wallet.Address, deviceToken2[:], env2, NotificationPushVersion_NOTIFICATION_PUSH_VERSION_2))

	subs, err := store.GetAPNSubscriptions(ctx, wallet.Address)
	req.NoError(err)
	req.Equal(2, len(subs))

	if subs[0].Environment == env1 {
		req.Equal(deviceToken1[:], subs[0].DeviceToken)
	} else {
		req.Equal(deviceToken1[:], subs[1].DeviceToken)
	}

	if subs[1].Environment == env1 {
		req.Equal(deviceToken1[:], subs[1].DeviceToken)
	} else {
		req.Equal(deviceToken1[:], subs[0].DeviceToken)
	}
}

func webPushExpired(req *require.Assertions, ctx context.Context, store *storage.PostgresNotificationStore) {
	wallet, err := crypto.NewWallet(ctx)
	req.NoError(err)

	exp1 := webpush.Subscription{
		Endpoint: fmt.Sprintf("https://%s.local.1", wallet.Address),
		Keys: webpush.Keys{
			Auth:   "test.auth.1",
			P256dh: "p256dh.test.1",
		},
	}

	exp2 := webpush.Subscription{
		Endpoint: fmt.Sprintf("https://%s.local.2", wallet.Address),
		Keys: webpush.Keys{
			Auth:   "test.auth.2",
			P256dh: "p256dh.test.2",
		},
	}

	err = store.AddWebPushSubscription(ctx, wallet.Address, &exp1)
	req.NoError(err)
	err = store.AddWebPushSubscription(ctx, wallet.Address, &exp2)
	req.NoError(err)

	got, err := store.GetWebPushSubscriptions(ctx, wallet.Address)
	req.NoError(err)

	req.Equal(2, len(got))

	req.NoError(store.RemoveExpiredWebPushSubscription(ctx, wallet.Address, &exp1))
	got, err = store.GetWebPushSubscriptions(ctx, wallet.Address)
	req.NoError(err)

	req.Equal(1, len(got))
	req.Equal(exp2.Endpoint, got[0].Sub.Endpoint)
}
