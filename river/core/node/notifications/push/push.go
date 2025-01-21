package push

import (
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/river-build/river/core/config"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/notifications/types"
	"github.com/river-build/river/core/node/protocol"
	"github.com/sideshow/apns2"
	payload2 "github.com/sideshow/apns2/payload"
	"github.com/sideshow/apns2/token"
)

type (
	MessageNotifier interface {
		// SendWebPushNotification sends a web push message to the browser using the
		// VAPID protocol to authenticate the message.
		SendWebPushNotification(
			ctx context.Context,
		// subscription object as returned by the browser on enabling subscriptions.
			subscription *webpush.Subscription,
		// event hash
			eventHash common.Hash,
		// payload of the message
			payload []byte,
		) (expired bool, err error)

		// SendApplePushNotification sends a push notification to the iOS app
		SendApplePushNotification(
			ctx context.Context,
		// sub APN
			sub *types.APNPushSubscription,
		// event hash
			eventHash common.Hash,
		// payload is sent to the APP
			payload *payload2.Payload,
		// payloadIncludesStreamEvent is true if the payload includes the stream event
			payloadIncludesStreamEvent bool,
		) (bool, int, error)
	}

	MessageNotifications struct {
		apnsAppBundleID string
		apnJwtSignKey   *ecdsa.PrivateKey
		apnKeyID        string
		apnTeamID       string
		apnExpiration   time.Duration

		// WebPush protected with VAPID
		vapidPrivateKey string
		vapidPublicKey  string
		vapidSubject    string

		// metrics
		webPushSent *prometheus.CounterVec
		apnSent     *prometheus.CounterVec
	}

	// MessageNotificationsSimulator implements MessageNotifier but doesn't send
	// the actual notification but only writes a log statement and captures the notification
	// in its internal state. This is intended for development and testing purposes.
	MessageNotificationsSimulator struct {
		WebPushNotificationsByEndpoint map[string][][]byte

		// metrics
		webPushSent *prometheus.CounterVec
		apnSent     *prometheus.CounterVec
	}
)

var (
	_ MessageNotifier = (*MessageNotifications)(nil)
	_ MessageNotifier = (*MessageNotificationsSimulator)(nil)
)

func NewMessageNotificationsSimulator(metricsFactory infra.MetricsFactory) *MessageNotificationsSimulator {
	webPushSent := metricsFactory.NewCounterVecEx(
		"webpush_sent",
		"Number of notifications send over web push",
		"status",
	)

	apnSent := metricsFactory.NewCounterVecEx(
		"apn_sent",
		"Number of notifications send over APN",
		"status",
	)

	return &MessageNotificationsSimulator{
		webPushSent:                    webPushSent,
		apnSent:                        apnSent,
		WebPushNotificationsByEndpoint: make(map[string][][]byte),
	}
}

func NewMessageNotifier(
	cfg *config.NotificationsConfig,
	metricsFactory infra.MetricsFactory,
) (*MessageNotifications, error) {
	apnExpiration := 12 * time.Hour // default
	if cfg.APN.Expiration > 0 {
		apnExpiration = cfg.APN.Expiration
	}

	// in case the authkey was passed with "\n" instead of actual newlines
	// pem.Decode fails. Replace these
	authKey := strings.Replace(strings.TrimSpace(cfg.APN.AuthKey), "\\n", "\n", -1)

	if authKey == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing APN auth key").
			Func("NewMessageNotifier")
	}

	blockPrivateKey, _ := pem.Decode([]byte(authKey))
	if blockPrivateKey == nil {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Invalid APN auth key").
			Func("NewMessageNotifier")
	}

	rawKey, err := x509.ParsePKCS8PrivateKey(blockPrivateKey.Bytes)
	if err != nil {
		return nil, AsRiverError(err).
			Message("Unable to parse APN auth key").
			Func("NewMessageNotifier")
	}

	apnJwtSignKey, ok := rawKey.(*ecdsa.PrivateKey)
	if !ok {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Invalid APN JWT signing key").
			Func("NewMessageNotifier")
	}

	if cfg.Web.Vapid.PrivateKey == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing VAPID private key").
			Func("NewMessageNotifier")
	}

	if cfg.Web.Vapid.PublicKey == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing VAPID public key").
			Func("NewMessageNotifier")
	}

	if cfg.Web.Vapid.Subject == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing VAPID subject").
			Func("NewMessageNotifier")
	}

	webPushSend := metricsFactory.NewCounterVecEx(
		"webpush_sent",
		"Number of notifications send over web push",
		"status",
	)

	apnSent := metricsFactory.NewCounterVecEx(
		"apn_sent",
		"Number of notifications send over APN",
		"status", "payload_stripped", "payload_version",
	)

	return &MessageNotifications{
		apnsAppBundleID: cfg.APN.AppBundleID,
		apnExpiration:   apnExpiration,
		apnJwtSignKey:   apnJwtSignKey,
		apnKeyID:        cfg.APN.KeyID,
		apnTeamID:       cfg.APN.TeamID,
		vapidPrivateKey: cfg.Web.Vapid.PrivateKey,
		vapidPublicKey:  cfg.Web.Vapid.PublicKey,
		vapidSubject:    cfg.Web.Vapid.Subject,
		webPushSent:     webPushSend,
		apnSent:         apnSent,
	}, nil
}

func (n *MessageNotifications) SendWebPushNotification(
	ctx context.Context,
	subscription *webpush.Subscription,
	eventHash common.Hash,
	payload []byte,
) (expired bool, err error) {
	options := &webpush.Options{
		Subscriber:      n.vapidSubject,
		TTL:             30,
		Urgency:         webpush.UrgencyHigh,
		VAPIDPublicKey:  n.vapidPublicKey,
		VAPIDPrivateKey: n.vapidPrivateKey,
	}

	res, err := webpush.SendNotificationWithContext(ctx, payload, subscription, options)
	if err != nil {
		n.webPushSent.With(prometheus.Labels{"status": fmt.Sprintf("%d", http.StatusServiceUnavailable)}).Inc()
		return false, AsRiverError(err).
			Message("Send notification with WebPush failed").
			Func("SendWebPushNotification")
	}
	defer res.Body.Close()

	n.webPushSent.With(prometheus.Labels{"status": fmt.Sprintf("%d", res.StatusCode)}).Inc()

	if res.StatusCode == http.StatusCreated {
		logging.FromCtx(ctx).Infow("Web push notification sent", "event", eventHash)
		return false, nil
	}

	riverErr := RiverError(protocol.Err_UNAVAILABLE,
		"Send notification with web push vapid failed",
		"statusCode", res.StatusCode,
		"status", res.Status,
		"event", eventHash,
	).Func("SendWebPushNotification")

	if resBody, err := io.ReadAll(res.Body); err == nil && len(resBody) > 0 {
		riverErr = riverErr.Tag("msg", string(resBody))
	}

	subExpired := res.StatusCode == http.StatusGone
	return subExpired, riverErr
}

func (n *MessageNotifications) SendApplePushNotification(
	ctx context.Context,
	sub *types.APNPushSubscription,
	eventHash common.Hash,
	payload *payload2.Payload,
	payloadIncludesStreamEvent bool,
) (bool, int, error) {
	notification := &apns2.Notification{
		DeviceToken: hex.EncodeToString(sub.DeviceToken),
		Topic:       n.apnsAppBundleID,
		Payload:     payload,
		Priority:    apns2.PriorityHigh,
		PushType:    apns2.PushTypeAlert,
		Expiration:  time.Now().Add(n.apnExpiration),
	}

	token := &token.Token{
		AuthKey: n.apnJwtSignKey,
		KeyID:   n.apnKeyID,
		TeamID:  n.apnTeamID,
	}

	client := apns2.NewTokenClient(token).Production()
	if sub.Environment == protocol.APNEnvironment_APN_ENVIRONMENT_SANDBOX {
		client = client.Development()
	}

	res, err := client.PushWithContext(ctx, notification)
	if err != nil {
		n.apnSent.With(prometheus.Labels{
			"status":           fmt.Sprintf("%d", http.StatusServiceUnavailable),
			"payload_stripped": fmt.Sprintf("%v", !payloadIncludesStreamEvent),
			"payload_version":  fmt.Sprintf("%d", sub.PushVersion),
		}).Inc()
		return false, http.StatusBadGateway, AsRiverError(err).
			Message("Send notification to APNS failed").
			Func("SendAPNNotification")
	}

	n.apnSent.With(prometheus.Labels{
		"status":           fmt.Sprintf("%d", res.StatusCode),
		"payload_stripped": fmt.Sprintf("%v", !payloadIncludesStreamEvent),
		"payload_version":  fmt.Sprintf("%d", sub.PushVersion),
	}).Inc()

	if res.Sent() {
		log := logging.FromCtx(ctx).With("event", eventHash, "apnsID", res.ApnsID)
		// ApnsUniqueID only available on development/sandbox,
		// use it to check in Apple's Delivery Logs to see the status.
		if sub.Environment == protocol.APNEnvironment_APN_ENVIRONMENT_SANDBOX {
			log = log.With("uniqueApnsID", res.ApnsUniqueID)
		}
		log.Infow("APN notification sent",
			"payloadVersion", sub.PushVersion, "payloadStripped", !payloadIncludesStreamEvent)

		return false, res.StatusCode, nil
	}

	subExpired := res.StatusCode == http.StatusGone

	riverErr := RiverError(protocol.Err_UNAVAILABLE,
		"Send notification to APNS failed",
		"statusCode", res.StatusCode,
		"apnsID", res.ApnsID,
		"reason", res.Reason,
		"deviceToken", sub.DeviceToken,
		"event", eventHash,
		"payloadVersion", sub.PushVersion,
		"payloadStripped", !payloadIncludesStreamEvent,
	).Func("SendAPNNotification")

	return subExpired, res.StatusCode, riverErr
}

func (n *MessageNotificationsSimulator) SendWebPushNotification(
	ctx context.Context,
	subscription *webpush.Subscription,
	eventHash common.Hash,
	payload []byte,
) (bool, error) {
	log := logging.FromCtx(ctx)
	log.Infow("SendWebPushNotification",
		"keys.p256dh", subscription.Keys.P256dh,
		"keys.auth", subscription.Keys.Auth,
		"payload", payload)

	n.WebPushNotificationsByEndpoint[subscription.Endpoint] = append(
		n.WebPushNotificationsByEndpoint[subscription.Endpoint], payload)

	n.webPushSent.With(prometheus.Labels{"status": "200"}).Inc()

	return false, nil
}

func (n *MessageNotificationsSimulator) SendApplePushNotification(
	ctx context.Context,
	sub *types.APNPushSubscription,
	eventHash common.Hash,
	payload *payload2.Payload,
	payloadIncludesStreamEvent bool,
) (bool, int, error) {
	log := logging.FromCtx(ctx)
	log.Debugw("SendApplePushNotification",
		"deviceToken", sub.DeviceToken,
		"env", fmt.Sprintf("%d", sub.Environment),
		"payload", payload,
		"payloadStripped", payloadIncludesStreamEvent,
		"payloadVersion", fmt.Sprintf("%d", sub.PushVersion),
	)

	n.apnSent.With(prometheus.Labels{"status": "200"}).Inc()

	return false, http.StatusOK, nil
}
