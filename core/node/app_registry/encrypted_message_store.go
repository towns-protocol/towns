package app_registry

import (
	"context"
	"fmt"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

type SessionMessages struct {
	AppId                 common.Address // included for logging / metrics
	DeviceKey             string
	EncryptedSharedSecret [32]byte
	CipherText            string
	WebhookUrl            string
	StreamEvents          [][]byte
}

// CachedEncryptedMessageQueue keeps app keys in the cache and
type CachedEncryptedMessageQueue struct {
	store         storage.AppRegistryStore
	appDispatcher *AppDispatcher
	appIdCache    sync.Map
}

func NewCachedEncryptedMessageQueue(
	ctx context.Context,
	store storage.AppRegistryStore,
	appDispatcher *AppDispatcher,
) (*CachedEncryptedMessageQueue, error) {
	queue := &CachedEncryptedMessageQueue{
		appDispatcher: appDispatcher,
		store:         store,
	}
	return queue, nil
}

func (q *CachedEncryptedMessageQueue) CreateApp(
	ctx context.Context,
	owner common.Address,
	app common.Address,
	sharedSecret [32]byte,
) error {
	return q.store.CreateApp(ctx, owner, app, sharedSecret)
}

func (q *CachedEncryptedMessageQueue) GetAppInfo(
	ctx context.Context,
	app common.Address,
) (*storage.AppInfo, error) {
	return q.store.GetAppInfo(ctx, app)
}

func (q *CachedEncryptedMessageQueue) RegisterWebhook(
	ctx context.Context,
	app common.Address,
	webhook string,
	deviceKey string,
	fallbackKey string,
) error {
	if err := q.store.RegisterWebhook(ctx, app, webhook, deviceKey, fallbackKey); err != nil {
		return err
	}

	q.appIdCache.Store(app, struct{}{})
	return nil
}

func (q *CachedEncryptedMessageQueue) PublishSessionKey(
	ctx context.Context,
	deviceKey string,
	sessionId string,
	ciphertext string,
) (err error) {
	sendableMessages, err := q.store.PublishSessionKey(ctx, deviceKey, sessionId, ciphertext)
	if err != nil {
		return err
	}
	messages := &SessionMessages{
		AppId:                 sendableMessages.AppId,
		EncryptedSharedSecret: sendableMessages.EncryptedSharedSecret,
		DeviceKey:             deviceKey,
		CipherText:            ciphertext,
		WebhookUrl:            sendableMessages.WebhookUrl,
		StreamEvents:          sendableMessages.StreamEvents,
	}
	return q.appDispatcher.SubmitMessages(ctx, messages)
}

// EnqueueMessages will immediately send a message for each device that has session keys, and will
// enqueue unsendable messages and send them as soon as keys become available.
func (q *CachedEncryptedMessageQueue) EnqueueMessages(
	ctx context.Context,
	appIds []common.Address,
	sessionId string,
	streamId shared.StreamId,
	streamEventBytes []byte,
) (err error) {
	sendableApps, unsendableApps, err := q.store.EnqueueUnsendableMessages(
		ctx,
		appIds,
		sessionId,
		streamEventBytes,
	)
	if err != nil {
		return err
	}

	if len(sendableApps)+len(unsendableApps) != len(appIds) {
		return base.AsRiverError(
			fmt.Errorf(
				"unexpected error: number of enqueued messages plus sendable devices does not equal the total number of devices",
			),
			protocol.Err_INTERNAL,
		).Func("CachedEncryptedMessageQueue.EnqueueMessages")
	}

	// Submit a single message for each sendable device
	for _, sendableApp := range sendableApps {
		if err := q.appDispatcher.SubmitMessages(ctx, &SessionMessages{
			AppId:                 sendableApp.AppId,
			DeviceKey:             sendableApp.DeviceKey,
			EncryptedSharedSecret: sendableApp.SendMessageSecrets.EncryptedSharedSecret,
			CipherText:            sendableApp.SendMessageSecrets.CipherText,
			WebhookUrl:            sendableApp.WebhookUrl,
			StreamEvents:          [][]byte{streamEventBytes},
		}); err != nil {
			return err
		}
	}
	return q.appDispatcher.RequestKeySolicitations(
		ctx,
		sessionId,
		streamId,
		unsendableApps,
	)
}

// HasRegisteredWebhook returns whether or not an app exists in the registry and has a webhook
// registered.
func (q *CachedEncryptedMessageQueue) HasRegisteredWebhook(
	ctx context.Context,
	appId common.Address,
) bool {
	_, exists := q.appIdCache.Load(appId)
	return exists
}
