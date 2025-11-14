package app_registry

import (
	"context"
	"fmt"
	"time"

	"github.com/gammazero/workerpool"
	"github.com/patrickmn/go-cache"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/app_registry/app_client"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

// AppDispatcher dispatches various requests to app services. Key solicitations are
// rate limited to 1 every 5 seconds per (device, session_id).
type AppDispatcher struct {
	appClient                  *app_client.AppClient
	workerPool                 workerpool.WorkerPool
	dataEncryptionKey          [32]byte
	solicitationRateLimitCache *cache.Cache
}

type SolicitationDevice = storage.UnsendableApp

func NewAppDispatcher(
	ctx context.Context,
	cfg *config.AppRegistryConfig,
	appClient *app_client.AppClient,
	dataEncryptionKey [32]byte,
) *AppDispatcher {
	workerPoolSize := cfg.NumMessageSendWorkers
	if workerPoolSize < 1 {
		workerPoolSize = 50
	}
	d := &AppDispatcher{
		appClient:                  appClient,
		workerPool:                 *workerpool.New(workerPoolSize),
		solicitationRateLimitCache: cache.New(5*time.Second, 1*time.Minute),
		dataEncryptionKey:          dataEncryptionKey,
	}

	// Cleanup
	go func() {
		<-ctx.Done()
		d.Close()
	}()

	return d
}

func (d *AppDispatcher) Close() {
	d.workerPool.Stop()
}

func (d *AppDispatcher) RequestKeySolicitations(
	ctx context.Context,
	sessionId string,
	channelId shared.StreamId,
	devices []SolicitationDevice,
) error {
	// Drop remaining work after node context expires
	if d.workerPool.Stopped() {
		return nil
	}

	for _, device := range devices {
		cacheKey := fmt.Sprintf("%s.%s", device.AppId.String(), sessionId)
		if _, found := d.solicitationRateLimitCache.Get(cacheKey); found {
			// If we've already notified the app to solicit a key for this session within the last
			// 5 seconds, ignore this request and give the app a chance to respond to the previous
			// request.
			continue
		} else {
			d.solicitationRateLimitCache.Set(cacheKey, struct{}{}, cache.DefaultExpiration)
			sharedSecret, err := decryptSharedSecret(device.EncryptedSharedSecret, d.dataEncryptionKey)
			if err != nil {
				return err
			}

			d.workerPool.Submit(
				func() {
					// TODO: retries?
					if err := d.appClient.RequestSolicitation(ctx, device.AppId, sharedSecret, device.WebhookUrl, channelId, sessionId); err != nil {
						logging.FromCtx(ctx).With("func", "AppDispatcher.RequestKeySolicitations").Errorw(
							"Could not complete request for app to send a key solicitation",
							"appId",
							device.AppId,
							"deviceKey",
							device.DeviceKey,
							"channel",
							channelId,
							"webhookUrl",
							device.WebhookUrl,
							"error",
							err,
						)
					}
				},
			)
		}
	}
	return nil
}

func (d *AppDispatcher) SubmitMessages(
	ctx context.Context,
	messages *SessionMessages,
) error {
	// Drop remaining work after node context expires
	if d.workerPool.Stopped() {
		return nil
	}

	sharedSecret, err := decryptSharedSecret(messages.EncryptedSharedSecret, d.dataEncryptionKey)
	if err != nil {
		return err
	}

	var encryptionEnvelopes [][]byte
	if messages.EncryptionEnvelope != nil {
		encryptionEnvelopes = append(encryptionEnvelopes, messages.EncryptionEnvelope)
	}

	d.workerPool.Submit(
		func() {
			log := logging.FromCtx(ctx)
			log.Infow(
				"Sending messages to bot",
				"appId",
				messages.AppId,
				"streamId",
				messages.StreamId,
				"messageCount",
				len(messages.MessageEnvelopes),
				"webhookUrl",
				messages.WebhookUrl,
			)
			if err := d.appClient.SendSessionMessages(
				ctx,
				messages.StreamId,
				messages.AppId,
				sharedSecret,
				messages.MessageEnvelopes,
				encryptionEnvelopes,
				messages.WebhookUrl,
			); err != nil {
				// TODO: retry logic?
				log.Errorw(
					"Could not send session messages",
					"appId",
					messages.AppId,
					"deviceKey",
					messages.DeviceKey,
					"webHookUrl",
					messages.WebhookUrl,
					"streamId",
					messages.StreamId,
					"error",
					err,
				)
			}
		},
	)
	return nil
}
