package push

import (
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/SherClockHolmes/webpush-go"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/river-build/river/core/config"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
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
		) (bool, error)
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

const (
	StatusSuccess = "success"
	StatusFailure = "failure"
)

func NewMessageNotificationsSimulator(metricsFactory infra.MetricsFactory) *MessageNotificationsSimulator {
	webPushSend := metricsFactory.NewCounterVecEx(
		"webpush_sent",
		"Number of notifications send over web push",
		"result",
	)

	apnSend := metricsFactory.NewCounterVecEx(
		"apn_sent",
		"Number of notifications send over APN",
		"result",
	)

	return &MessageNotificationsSimulator{
		webPushSent:                    webPushSend,
		apnSent:                        apnSend,
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
		"result",
	)

	apnSend := metricsFactory.NewCounterVecEx(
		"apn_sent",
		"Number of notifications send over APN",
		"result",
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
		apnSent:         apnSend,
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
		n.webPushSent.With(prometheus.Labels{"result": StatusFailure}).Inc()
		return false, AsRiverError(err).
			Message("Send notification with WebPush failed").
			Func("SendWebPushNotification")
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusCreated {
		n.webPushSent.With(prometheus.Labels{"result": StatusSuccess}).Inc()
		dlog.FromCtx(ctx).Info("Web push notification sent", "event", eventHash)
		return false, nil
	}

	n.webPushSent.With(prometheus.Labels{"result": StatusFailure}).Inc()

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
) (bool, error) {
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
		n.apnSent.With(prometheus.Labels{"result": StatusFailure}).Inc()
		return false, AsRiverError(err).
			Message("Send notification to APNS failed").
			Func("SendAPNNotification")
	}

	if res.Sent() {
		n.apnSent.With(prometheus.Labels{"result": StatusSuccess}).Inc()
		log := dlog.FromCtx(ctx).With("event", eventHash, "apnsID", res.ApnsID)
		// ApnsUniqueID only available on development/sandbox,
		// use it to check in Apple's Delivery Logs to see the status.
		if sub.Environment == protocol.APNEnvironment_APN_ENVIRONMENT_SANDBOX {
			log = log.With("uniqueApnsID", res.ApnsUniqueID)
		}
		log.Info("APN notification sent")

		return false, nil
	}

	n.apnSent.With(prometheus.Labels{"result": StatusFailure}).Inc()

	subExpired := res.StatusCode == http.StatusGone

	return subExpired, RiverError(protocol.Err_UNAVAILABLE,
		"Send notification to APNS failed",
		"statusCode", res.StatusCode,
		"apnsID", res.ApnsID,
		"reason", res.Reason,
		"deviceToken", sub.DeviceToken,
		"event", eventHash,
	).Func("SendAPNNotification")
}

func (n *MessageNotificationsSimulator) SendWebPushNotification(
	ctx context.Context,
	subscription *webpush.Subscription,
	eventHash common.Hash,
	payload []byte,
) (bool, error) {
	log := dlog.FromCtx(ctx)
	log.Info("SendWebPushNotification",
		"keys.p256dh", subscription.Keys.P256dh,
		"keys.auth", subscription.Keys.Auth,
		"payload", payload)

	n.WebPushNotificationsByEndpoint[subscription.Endpoint] = append(
		n.WebPushNotificationsByEndpoint[subscription.Endpoint], payload)

	n.webPushSent.With(prometheus.Labels{"result": StatusSuccess}).Inc()

	return false, nil
}

func (n *MessageNotificationsSimulator) SendApplePushNotification(
	ctx context.Context,
	sub *types.APNPushSubscription,
	eventHash common.Hash,
	payload *payload2.Payload,
) (bool, error) {
	log := dlog.FromCtx(ctx)
	log.Debug("SendApplePushNotification",
		"deviceToken", sub.DeviceToken,
		"env", sub.Environment,
		"payload", payload)

	n.apnSent.With(prometheus.Labels{"result": StatusSuccess}).Inc()

	return false, nil
}
