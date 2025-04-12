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

// SessionMessages encapsulates all the needed information for an app client to send
// a batch of messages in the same stream, encrypted by the same collection of
// session ids.
type SessionMessages struct {
	StreamId              shared.StreamId
	AppId                 common.Address // included for logging / metrics
	DeviceKey             string
	EncryptedSharedSecret [32]byte
	EncryptionEnvelope    []byte
	WebhookUrl            string
	MessageEnvelopes      [][]byte
}

// CachedEncryptedMessageQueue enqueues and dispatches messages to app servers according
// to the availability of needed session keys. It also keeps the list of app ids in memory
// for the sake of determining which channel members are apps.
type CachedEncryptedMessageQueue struct {
	store         storage.AppRegistryStore
	appDispatcher *AppDispatcher
	appIdCache    sync.Map
}

type ForwardState struct {
	HasWebhook     bool
	ForwardSetting protocol.ForwardSettingValue
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
	forwardSetting protocol.ForwardSettingValue,
	sharedSecret [32]byte,
) error {
	q.appIdCache.Store(app, &ForwardState{ForwardSetting: forwardSetting})
	return q.store.CreateApp(ctx, owner, app, forwardSetting, sharedSecret)
}

func (q *CachedEncryptedMessageQueue) RotateSharedSecret(
	ctx context.Context,
	app common.Address,
	sharedSecret [32]byte,
) error {
	return q.store.RotateSecret(ctx, app, sharedSecret)
}

func (q *CachedEncryptedMessageQueue) GetAppInfo(
	ctx context.Context,
	app common.Address,
) (*storage.AppInfo, error) {
	return q.store.GetAppInfo(ctx, app)
}

func (q *CachedEncryptedMessageQueue) UpdateForwardSetting(
	ctx context.Context,
	app common.Address,
	forwardSetting protocol.ForwardSettingValue,
) error {
	return q.store.UpdateForwardSetting(ctx, app, forwardSetting)
}

func (q *CachedEncryptedMessageQueue) RegisterWebhook(
	ctx context.Context,
	app common.Address,
	webhook string,
	deviceKey string,
	fallbackKey string,
) error {
	if fs, exists := q.appIdCache.Load(app); exists {
		fs.(*ForwardState).HasWebhook = true
	}
	if err := q.store.RegisterWebhook(ctx, app, webhook, deviceKey, fallbackKey); err != nil {
		return err
	}

	return nil
}

func (q *CachedEncryptedMessageQueue) GetSessionKey(
	ctx context.Context,
	app common.Address,
	sessionId string,
) (encryptionEnvelope []byte, err error) {
	return q.store.GetSessionKey(ctx, app, sessionId)
}

func (q *CachedEncryptedMessageQueue) PublishSessionKeys(
	ctx context.Context,
	streamId shared.StreamId,
	deviceKey string,
	sessionIds []string,
	encryptionEnvelope []byte,
) (err error) {
	sendableMessages, err := q.store.PublishSessionKeys(ctx, streamId, deviceKey, sessionIds, encryptionEnvelope)
	if err != nil {
		return err
	}
	if sendableMessages != nil {
		messages := &SessionMessages{
			StreamId:              streamId,
			AppId:                 sendableMessages.AppId,
			EncryptedSharedSecret: sendableMessages.EncryptedSharedSecret,
			DeviceKey:             deviceKey,
			EncryptionEnvelope:    encryptionEnvelope,
			WebhookUrl:            sendableMessages.WebhookUrl,
			MessageEnvelopes:      sendableMessages.MessageEnvelopes,
		}
		return q.appDispatcher.SubmitMessages(ctx, messages)
	} else {
		return nil
	}
}

// DispatchOrEnqueueMessages will immediately send a message for each device that has session keys, and will
// enqueue unsendable messages and send them as soon as keys become available.
func (q *CachedEncryptedMessageQueue) DispatchOrEnqueueMessages(
	ctx context.Context,
	appIds []common.Address,
	sessionId string,
	channelId shared.StreamId,
	envelopeBytes []byte,
) (err error) {
	// log := logging.FromCtx(ctx)
	sendableApps, unsendableApps, err := q.store.EnqueueUnsendableMessages(
		ctx,
		appIds,
		sessionId,
		envelopeBytes,
	)
	if err != nil {
		return err
	}
	// log.Debugw(
	// 	"enqueue unsendable messages",
	// 	"sendableApps",
	// 	sendableApps,
	// 	"unsendableApps",
	// 	unsendableApps,
	// 	"sessionId",
	// 	sessionId,
	// 	"channelId",
	// 	channelId,
	// )

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
			StreamId:              channelId,
			AppId:                 sendableApp.AppId,
			DeviceKey:             sendableApp.DeviceKey,
			EncryptedSharedSecret: sendableApp.SendMessageSecrets.EncryptedSharedSecret,
			EncryptionEnvelope:    sendableApp.SendMessageSecrets.EncryptionEnvelope,
			WebhookUrl:            sendableApp.WebhookUrl,
			MessageEnvelopes:      [][]byte{envelopeBytes},
		}); err != nil {
			return err
		}
	}
	// log.Debugw(
	// 	"RequestKeySolicitations",
	// 	"channelId",
	// 	channelId,
	// 	"unsendable",
	// 	unsendableApps,
	// 	"sessionId",
	// 	sessionId,
	// 	"channelId",
	// 	channelId,
	// )
	return q.appDispatcher.RequestKeySolicitations(
		ctx,
		sessionId,
		channelId,
		unsendableApps,
	)
}

// IsForwardableApp returns whether or not an app exists in the registry and has a webhook
// registered, and, if so, what forward setting should be used when filtering relevant
// messages.
func (q *CachedEncryptedMessageQueue) IsForwardableApp(
	ctx context.Context,
	appId common.Address,
) (isForwardable bool, forwardSetting protocol.ForwardSettingValue, err error) {
	fs, exists := q.appIdCache.Load(appId)
	if exists {
		forwardState := fs.(*ForwardState)
		return forwardState.HasWebhook, forwardState.ForwardSetting, nil
	} else {
		info, err := q.store.GetAppInfo(ctx, appId)
		if err != nil {
			return false, 0, base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).Message("Could not determine if the app has a registered webhook")
		}
		fs, _ = q.appIdCache.LoadOrStore(appId, &ForwardState{
			HasWebhook:     info.WebhookUrl != "",
			ForwardSetting: info.ForwardSetting,
		})
		forwardState := fs.(*ForwardState)
		return forwardState.HasWebhook, forwardState.ForwardSetting, nil
	}
}
