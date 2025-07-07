package app_registry

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/hashicorp/golang-lru/arc/v2"

	"github.com/towns-protocol/towns/core/node/app_registry/types"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
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
	// the appIdCache stores forward settings for each app. These are used
	// to determine whether or not to forward to each app in a channel whenever
	// a new message is received.
	appIdCache sync.Map

	// metadataCache stores app metadata with TTL to reduce database queries.
	metadataCache *arc.ARCCache[string, *metadataCacheEntry]
}

// metadataCacheEntry holds cached metadata with a timestamp for TTL validation
type metadataCacheEntry struct {
	metadata  *types.AppMetadata
	timestamp time.Time
}

type ForwardState struct {
	HasWebhook bool
	Settings   atomic.Pointer[types.AppSettings]
}

func NewCachedEncryptedMessageQueue(
	ctx context.Context,
	store storage.AppRegistryStore,
	appDispatcher *AppDispatcher,
) (*CachedEncryptedMessageQueue, error) {
	// Initialize metadata cache with 50,000 max entries
	metadataCache, err := arc.NewARC[string, *metadataCacheEntry](50000)
	if err != nil {
		return nil, base.AsRiverError(err, protocol.Err_INTERNAL).
			Message("Unable to create metadata cache")
	}

	queue := &CachedEncryptedMessageQueue{
		appDispatcher: appDispatcher,
		store:         store,
		metadataCache: metadataCache,
	}
	return queue, nil
}

func (q *CachedEncryptedMessageQueue) CreateApp(
	ctx context.Context,
	owner common.Address,
	app common.Address,
	settings types.AppSettings,
	metadata types.AppMetadata,
	sharedSecret [32]byte,
) error {
	fs := &ForwardState{}
	fs.Settings.Store(&settings)
	q.appIdCache.Store(app, fs)
	
	err := q.store.CreateApp(ctx, owner, app, settings, metadata, sharedSecret)
	if err != nil {
		return err
	}
	
	// Pre-warm metadata cache for newly created app
	cacheKey := app.String()
	q.metadataCache.Add(cacheKey, &metadataCacheEntry{
		metadata:  &metadata,
		timestamp: time.Now(),
	})
	
	return nil
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

func (q *CachedEncryptedMessageQueue) UpdateSettings(
	ctx context.Context,
	app common.Address,
	settings types.AppSettings,
) error {
	err := q.store.UpdateSettings(ctx, app, settings)
	if err == nil {
		if fs, exists := q.appIdCache.Load(app); exists {
			fs.(*ForwardState).Settings.Store(&settings)
		}
	}
	return err
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

func (q *CachedEncryptedMessageQueue) SetAppMetadata(
	ctx context.Context,
	app common.Address,
	metadata types.AppMetadata,
) error {
	err := q.store.SetAppMetadata(ctx, app, metadata)
	if err != nil {
		return err
	}
	
	// Invalidate cache on successful update
	cacheKey := app.String()
	q.metadataCache.Remove(cacheKey)
	
	// Pre-populate with new value
	q.metadataCache.Add(cacheKey, &metadataCacheEntry{
		metadata:  &metadata,
		timestamp: time.Now(),
	})
	
	return nil
}

func (q *CachedEncryptedMessageQueue) GetAppMetadata(
	ctx context.Context,
	app common.Address,
) (*types.AppMetadata, error) {
	cacheKey := app.String()
	
	// Check cache with TTL validation (15 seconds)
	if entry, exists := q.metadataCache.Get(cacheKey); exists {
		if time.Since(entry.timestamp) < 15*time.Second {
			// Cache hit with valid TTL
			return entry.metadata, nil
		}
		// Expired entry, remove it
		q.metadataCache.Remove(cacheKey)
	}
	
	// Cache miss or expired, fetch from store
	metadata, err := q.store.GetAppMetadata(ctx, app)
	if err != nil {
		return nil, err
	}
	
	// Cache the result
	q.metadataCache.Add(cacheKey, &metadataCacheEntry{
		metadata:  metadata,
		timestamp: time.Now(),
	})
	
	return metadata, nil
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
// enqueue unsendable messages and send them as soon as keys become available for each app. The session id
// here is the session_id_bytes of an EncryptedData message, if this is the actual content of the channel event.
// Otherwise it will be an empty string, and the message should be immediately sendable to all devices.
func (q *CachedEncryptedMessageQueue) DispatchOrEnqueueMessages(
	ctx context.Context,
	appIds []common.Address,
	sessionId string,
	channelId shared.StreamId,
	envelopeBytes []byte,
) (err error) {
	var sendableApps []storage.SendableApp
	var unsendableApps []storage.UnsendableApp

	if sessionId == "" {
		// If the session id is empty, the event can be sent without session keys.
		sendableApps, err = q.store.GetSendableApps(ctx, appIds)
	} else {
		sendableApps, unsendableApps, err = q.store.EnqueueUnsendableMessages(
			ctx,
			appIds,
			sessionId,
			envelopeBytes,
		)
	}
	if err != nil {
		return err
	}
	log := logging.FromCtx(ctx)
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
		).Func("CachedEncryptedMessageQueue.EnqueueMessages").LogError(log)
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

func (q *CachedEncryptedMessageQueue) IsApp(ctx context.Context, userId common.Address) (bool, error) {
	_, exists := q.appIdCache.Load(userId)
	if exists {
		return true, nil
	} else {
		info, err := q.store.GetAppInfo(ctx, userId)
		if err != nil {
			if base.AsRiverError(err).Code == protocol.Err_NOT_FOUND {
				return false, nil
			} else {
				return false, base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).Message("Could not determine if the id is an app")
			}
		}
		fs := &ForwardState{
			HasWebhook: info.WebhookUrl != "",
		}
		fs.Settings.Store(&info.Settings)
		_, _ = q.appIdCache.LoadOrStore(userId, fs)
		return true, nil
	}
}

// IsForwardableApp returns whether or not an app exists in the registry and has a webhook
// registered, and, if so, what forward setting should be used when filtering relevant
// messages.
func (q *CachedEncryptedMessageQueue) IsForwardableApp(
	ctx context.Context,
	appId common.Address,
) (isForwardable bool, settings types.AppSettings, err error) {
	fs, exists := q.appIdCache.Load(appId)
	if exists {
		forwardState := fs.(*ForwardState)
		return forwardState.HasWebhook, *forwardState.Settings.Load(), nil
	} else {
		info, err := q.store.GetAppInfo(ctx, appId)
		if err != nil {
			if base.AsRiverError(err).Code == protocol.Err_NOT_FOUND {
				return false, types.AppSettings{}, nil
			}
			return false, types.AppSettings{}, base.AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).Message("Could not determine if the app has a registered webhook")
		}
		forwardState := &ForwardState{
			HasWebhook: info.WebhookUrl != "",
		}
		forwardState.Settings.Store(&info.Settings)
		fs, _ = q.appIdCache.LoadOrStore(appId, forwardState)
		forwardState = fs.(*ForwardState)
		return forwardState.HasWebhook, *forwardState.Settings.Load(), nil
	}
}

// IsDisplayNameAvailable checks if a display name is available for use
func (q *CachedEncryptedMessageQueue) IsDisplayNameAvailable(
	ctx context.Context,
	displayName string,
) (bool, error) {
	return q.store.IsDisplayNameAvailable(ctx, displayName)
}
