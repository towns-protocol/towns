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
	"github.com/sideshow/apns2"
	payload2 "github.com/sideshow/apns2/payload"
	"github.com/sideshow/apns2/token"

	"github.com/towns-protocol/towns/core/config"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/notifications/types"
	"github.com/towns-protocol/towns/core/node/protocol"
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
		// app identifies which app config to use
			app protocol.NotificationApp,
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
		// app identifies which app config to use
			app protocol.NotificationApp,
		) (bool, int, error)
	}

	MessageNotifications struct {
		// App-specific configurations
		appConfigs map[protocol.NotificationApp]*AppNotificationConfig

		// metrics
		webPushSent *prometheus.CounterVec
		apnSent     *prometheus.CounterVec
	}

	// AppNotificationConfig holds notification config for a specific app
	AppNotificationConfig struct {
		// APN configuration
		apnsAppBundleID string
		apnJwtSignKey   *ecdsa.PrivateKey
		apnKeyID        string
		apnTeamID       string
		apnExpiration   time.Duration

		// WebPush protected with VAPID
		vapidPrivateKey string
		vapidPublicKey  string
		vapidSubject    string
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
	// Handle legacy configuration (single app)
	if len(cfg.Apps) == 0 && (cfg.APN.AppBundleID != "" || cfg.Web.Vapid.PrivateKey != "") {
		// Convert legacy config to Apps format
		cfg.Apps = []config.AppNotificationConfig{{
			App: int32(protocol.NotificationApp_NOTIFICATION_APP_TOWNS),
			APN: cfg.APN,
			Web: cfg.Web,
		}}
	}

	appConfigs := make(map[protocol.NotificationApp]*AppNotificationConfig)

	for _, appCfg := range cfg.Apps {
		appConfig, err := createAppNotificationConfig(&appCfg)
		if err != nil {
			return nil, err
		}
		appConfigs[protocol.NotificationApp(appCfg.App)] = appConfig
	}

	webPushSend := metricsFactory.NewCounterVecEx(
		"webpush_sent",
		"Number of notifications send over web push",
		"status", "app",
	)

	apnSent := metricsFactory.NewCounterVecEx(
		"apn_sent",
		"Number of notifications send over APN",
		"status", "payload_stripped", "payload_version", "app",
	)

	return &MessageNotifications{
		appConfigs:  appConfigs,
		webPushSent: webPushSend,
		apnSent:     apnSent,
	}, nil
}

func createAppNotificationConfig(cfg *config.AppNotificationConfig) (*AppNotificationConfig, error) {
	apnExpiration := 12 * time.Hour // default
	if cfg.APN.Expiration > 0 {
		apnExpiration = cfg.APN.Expiration
	}

	// in case the authkey was passed with "\n" instead of actual newlines
	// pem.Decode fails. Replace these
	authKey := strings.Replace(strings.TrimSpace(cfg.APN.AuthKey), "\\n", "\n", -1)

	if authKey == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing APN auth key for app").
			Func("createAppNotificationConfig").
			Tag("app", cfg.App)
	}

	blockPrivateKey, _ := pem.Decode([]byte(authKey))
	if blockPrivateKey == nil {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Invalid APN auth key").
			Func("createAppNotificationConfig").
			Tag("app", cfg.App)
	}

	rawKey, err := x509.ParsePKCS8PrivateKey(blockPrivateKey.Bytes)
	if err != nil {
		return nil, AsRiverError(err).
			Message("Unable to parse APN auth key").
			Func("createAppNotificationConfig").
			Tag("app", cfg.App)
	}

	apnJwtSignKey, ok := rawKey.(*ecdsa.PrivateKey)
	if !ok {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Invalid APN JWT signing key").
			Func("createAppNotificationConfig").
			Tag("app", cfg.App)
	}

	if cfg.Web.Vapid.PrivateKey == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing VAPID private key").
			Func("createAppNotificationConfig").
			Tag("app", cfg.App)
	}

	if cfg.Web.Vapid.PublicKey == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing VAPID public key").
			Func("createAppNotificationConfig").
			Tag("app", cfg.App)
	}

	if cfg.Web.Vapid.Subject == "" {
		return nil, RiverError(protocol.Err_BAD_CONFIG, "Missing VAPID subject").
			Func("createAppNotificationConfig").
			Tag("app", cfg.App)
	}

	return &AppNotificationConfig{
		apnsAppBundleID: cfg.APN.AppBundleID,
		apnExpiration:   apnExpiration,
		apnJwtSignKey:   apnJwtSignKey,
		apnKeyID:        cfg.APN.KeyID,
		apnTeamID:       cfg.APN.TeamID,
		vapidPrivateKey: cfg.Web.Vapid.PrivateKey,
		vapidPublicKey:  cfg.Web.Vapid.PublicKey,
		vapidSubject:    cfg.Web.Vapid.Subject,
	}, nil
}

func (n *MessageNotifications) SendWebPushNotification(
	ctx context.Context,
	subscription *webpush.Subscription,
	eventHash common.Hash,
	payload []byte,
	app protocol.NotificationApp,
) (expired bool, err error) {
	appConfig, ok := n.appConfigs[app]
	if !ok {
		return false, RiverError(protocol.Err_INVALID_ARGUMENT, "No configuration for app").
			Func("SendWebPushNotification").
			Tag("app", app)
	}

	options := &webpush.Options{
		Subscriber:      appConfig.vapidSubject,
		TTL:             30,
		Urgency:         webpush.UrgencyHigh,
		VAPIDPublicKey:  appConfig.vapidPublicKey,
		VAPIDPrivateKey: appConfig.vapidPrivateKey,
	}

	res, err := webpush.SendNotificationWithContext(ctx, payload, subscription, options)
	if err != nil {
		n.webPushSent.With(prometheus.Labels{
			"status": fmt.Sprintf("%d", http.StatusServiceUnavailable),
			"app":    app.String(),
		}).Inc()
		return false, AsRiverError(err).
			Message("Send notification with WebPush failed").
			Func("SendWebPushNotification")
	}
	defer res.Body.Close()

	n.webPushSent.With(prometheus.Labels{
		"status": fmt.Sprintf("%d", res.StatusCode),
		"app":    app.String(),
	}).Inc()

	if res.StatusCode == http.StatusCreated {
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

	subExpired := res.StatusCode == http.StatusGone || res.StatusCode == http.StatusNotFound
	return subExpired, riverErr
}

func (n *MessageNotifications) SendApplePushNotification(
	ctx context.Context,
	sub *types.APNPushSubscription,
	eventHash common.Hash,
	payload *payload2.Payload,
	payloadIncludesStreamEvent bool,
	app protocol.NotificationApp,
) (bool, int, error) {
	appConfig, ok := n.appConfigs[app]
	if !ok {
		return false, http.StatusBadGateway, RiverError(protocol.Err_INVALID_ARGUMENT, "No configuration for app").
			Func("SendApplePushNotification").
			Tag("app", app)
	}

	notification := &apns2.Notification{
		DeviceToken: hex.EncodeToString(sub.DeviceToken),
		Topic:       appConfig.apnsAppBundleID,
		Payload:     payload,
		Priority:    apns2.PriorityHigh,
		PushType:    apns2.PushTypeAlert,
		Expiration:  time.Now().Add(appConfig.apnExpiration),
	}

	token := &token.Token{
		AuthKey: appConfig.apnJwtSignKey,
		KeyID:   appConfig.apnKeyID,
		TeamID:  appConfig.apnTeamID,
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
			"app":              app.String(),
		}).Inc()
		return false, http.StatusBadGateway, AsRiverError(err).
			Message("Send notification to APNS failed").
			Func("SendAPNNotification")
	}

	n.apnSent.With(prometheus.Labels{
		"status":           fmt.Sprintf("%d", res.StatusCode),
		"payload_stripped": fmt.Sprintf("%v", !payloadIncludesStreamEvent),
		"payload_version":  fmt.Sprintf("%d", sub.PushVersion),
		"app":              app.String(),
	}).Inc()

	if res.Sent() {
		log := logging.FromCtx(ctx).With("event", eventHash, "apnsID", res.ApnsID)
		// ApnsUniqueID only available on development/sandbox,
		// use it to check in Apple's Delivery Logs to see the status.
		if sub.Environment == protocol.APNEnvironment_APN_ENVIRONMENT_SANDBOX {
			log = log.With("uniqueApnsID", res.ApnsUniqueID)
		}

		log.Infow("APN notification sent",
			"payloadVersion", sub.PushVersion,
			"payloadStripped", !payloadIncludesStreamEvent,
			"payload", payload)

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
	app protocol.NotificationApp,
) (bool, error) {
	log := logging.FromCtx(ctx)
	log.Infow("SendWebPushNotification",
		"keys.p256dh", subscription.Keys.P256dh,
		"keys.auth", subscription.Keys.Auth,
		"payload", payload,
		"app", app.String())

	n.WebPushNotificationsByEndpoint[subscription.Endpoint] = append(
		n.WebPushNotificationsByEndpoint[subscription.Endpoint], payload)

	n.webPushSent.With(prometheus.Labels{
		"status": "200",
		"app":    app.String(),
	}).Inc()

	return false, nil
}

func (n *MessageNotificationsSimulator) SendApplePushNotification(
	ctx context.Context,
	sub *types.APNPushSubscription,
	eventHash common.Hash,
	payload *payload2.Payload,
	payloadIncludesStreamEvent bool,
	app protocol.NotificationApp,
) (bool, int, error) {
	log := logging.FromCtx(ctx)

	log.Debugw("SendApplePushNotification",
		"deviceToken", sub.DeviceToken,
		"env", fmt.Sprintf("%d", sub.Environment),
		"payload", payload,
		"payloadStripped", payloadIncludesStreamEvent,
		"payloadVersion", fmt.Sprintf("%d", sub.PushVersion),
		"app", app.String(),
	)

	n.apnSent.With(prometheus.Labels{
		"status":           "200",
		"payload_stripped": fmt.Sprintf("%v", !payloadIncludesStreamEvent),
		"payload_version":  fmt.Sprintf("%d", sub.PushVersion),
		"app":              app.String(),
	}).Inc()

	return false, http.StatusOK, nil
}
