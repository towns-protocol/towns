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
					Subject:    "support@towns.com",
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
					Subject:    "support@towns.com",
				},
			},
		}

		// adding token:  with auth:  and notification url:
		// 0xAc8828aD220471984e5Ae5B1243E8B591a58A05F endpoint
		notifier, err = push.NewMessageNotifier(cfg, infra.NewMetricsFactory(nil, "", ""))
		//subscription  = &webpush.Subscription{
		//	Endpoint: "https://web.push.apple.com/QFZ_WHVoj3YhGbgQd9JYUqQgHnUvOA5lfTkuQ0fUfZa6vu_UbmS_CXe3IhovScieS2-ZBdjbhBfhGtb-D2rYmKklk6DEfkM0AClqH85bPH7N9wI6_-ydrhLBr5yn6SOvYP2bCgxE7Ob-1sI1Zd5VcJOKJpp-caC3VfF3wP7P40s",
		//	Keys: webpush.Keys{
		//		Auth:   `K4GtYnxnyGQNm1QsypliQg`,
		//		P256dh: `BCDQjdc3OB_elS32uVI96gJayYwYjj6JXTOizaXpgEvxOCqmdxz-0XNcuI2JZZnxi6adkBFy8ZrjMEcB7StQC_s`,
		//	},
		//}

		subscription = &webpush.Subscription{
			Endpoint: "https://fcm.googleapis.com/fcm/send/fOsW4EcoiMI:APA91bFe0AKQLJw8ghNXLz9bqE49EqRoneHO8oBqf_qZ32mZhluyE40tsy0vY3q2jlj_glYiyofTVE4J2DbE8tbO4EAR5szQR2fGfEVE6WilIP8O0ThfP5Gga5u0D2ChUTOs2CMnxN2d",
			Keys: webpush.Keys{
				Auth:   `TZCAll5Dli8LOUYIXk9a1g`,
				P256dh: `BJJnVK40pKFTSKK0wLSnJVVh_lIc-9Axu_tkL1fTgdC0_a6LrZ4Z9WePvgDAd13GEXONBwZ8fXqaAWwZoKKzL38`,
			},
		}
		payload = []byte("Some message")
	)

	if cfg.Web.Vapid.PrivateKey == "" || cfg.Web.Vapid.PublicKey == "" || cfg.Web.Vapid.Subject == "" {
		t.Skip("Missing required config to run this test")
	}

	req.NoError(err, "instantiate Web push notifications client")

	//payload := payload2.NewPayload().Alert("Sry to bother you if this works...")

	req.NoError(notifier.SendWebPushNotification(ctx, subscription, common.Hash{1}, payload),
		"send web push notification")
}
