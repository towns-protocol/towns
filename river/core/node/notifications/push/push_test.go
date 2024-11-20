package push_test

import (
	"context"
	"encoding/hex"
	"os"
	"testing"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/notifications/push"
	"github.com/river-build/river/core/node/notifications/types"
	"github.com/river-build/river/core/node/protocol"
	payload2 "github.com/sideshow/apns2/payload"
	"github.com/stretchr/testify/require"
)

func TestAPNSPushNotification(t *testing.T) {
	t.Parallel()

	var (
		req = require.New(t)
		ctx = context.Background()
		cfg = &config.NotificationsConfig{
			APN: config.APNPushNotificationsConfig{
				AppBundleID: "com.towns.internal",
				Expiration:  30 * time.Minute,
				KeyID:       os.Getenv("TEST_APN_KEY_ID"),
				TeamID:      os.Getenv("TEST_APN_TEAM_ID"),
				AuthKey:     os.Getenv("TEST_APN_AUTH_KEY"),
			},
			Web: config.WebPushNotificationConfig{
				Vapid: config.WebPushVapidNotificationConfig{
					PrivateKey: os.Getenv("TEST_WEB_PUSH_VAPID_PRIV_KEY"),
					PublicKey:  os.Getenv("TEST_WEB_PUSH_VAPID_PUB_KEY"),
					Subject:    "mailto:support@towns.com",
				},
			},
		}
		notifier, err  = push.NewMessageNotifier(cfg, infra.NewMetricsFactory(nil, "", ""))
		deviceTokenHex = os.Getenv("TEST_APN_APPLE_DEVICE_TOKEN")
	)

	if cfg.APN.KeyID == "" || cfg.APN.TeamID == "" || cfg.APN.AuthKey == "" || deviceTokenHex == "" {
		t.Skip("Missing required config to run this test")
	}

	req.NoError(err, "instantiate APN push notifications client")

	payload := payload2.NewPayload().Alert("Sry to bother you if this works...")

	deviceToken, err := hex.DecodeString(deviceTokenHex)
	req.NoError(err)

	sub := types.APNPushSubscription{
		DeviceToken: deviceToken,
		LastSeen:    time.Now(),
		Environment: protocol.APNEnvironment_APN_ENVIRONMENT_SANDBOX,
	}

	req.NoError(notifier.SendApplePushNotification(
		ctx, &sub, common.Hash{1}, payload), "send APN notification")
}

func TestWebPushWithVapid(t *testing.T) {
	t.Parallel()

	var (
		req = require.New(t)
		ctx = context.Background()
		cfg = &config.NotificationsConfig{
			APN: config.APNPushNotificationsConfig{
				AppBundleID: "com.towns.internal",
				Expiration:  30 * time.Minute,
				KeyID:       os.Getenv("TEST_APN_KEY_ID"),
				TeamID:      os.Getenv("TEST_APN_TEAM_ID"),
				AuthKey:     os.Getenv("TEST_APN_AUTH_KEY"),
			},
			Web: config.WebPushNotificationConfig{
				Vapid: config.WebPushVapidNotificationConfig{
					PrivateKey: os.Getenv("TEST_WEB_PUSH_VAPID_PRIV_KEY"),
					PublicKey:  os.Getenv("TEST_WEB_PUSH_VAPID_PUB_KEY"),
					Subject:    "mailto:support@towns.com",
				},
			},
		}

		notifier, err = push.NewMessageNotifier(cfg, infra.NewMetricsFactory(nil, "", ""))
		subscription  = &webpush.Subscription{
			Endpoint: "https://fcm.googleapis.com/fcm/send/foL7GIZIaxE:APA91bF0RzFgV4fY7S0fnUpby_ZJz-fpAqopN5JYIjW9qezB8nlx9RVf1uLhAX5D00QIkBmIFcw8xSU5T-NIPo8zQSxmpSJS6YC-AAyJ9xMVTGJMuKG4dw4GxAVZre6rdn-_ci65GnkR",
			Keys: webpush.Keys{
				Auth:   `6w5p4KNcekzGWQ2nTau9Gw`,
				P256dh: `BLfO-qNZbbEr9kNZ3AxmmHNWGyeXRxUR1rC6TXpMZd6oUeGb3xC2qskuEVEiuz5Aif55f8ysagYPN0LICuLMG70`,
			},
		}
		payload = []byte("Some message")
	)

	if cfg.Web.Vapid.PrivateKey == "" || cfg.Web.Vapid.PublicKey == "" {
		t.Skip("Missing required config to run this test")
	}

	req.NoError(err, "instantiate Web push notifications client")

	//payload := payload2.NewPayload().Alert("Sry to bother you if this works...")

	req.NoError(notifier.SendWebPushNotification(ctx, subscription, common.Hash{1}, payload), "send APN notification")
}
