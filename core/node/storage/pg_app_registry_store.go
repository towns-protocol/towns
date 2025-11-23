package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	mapset "github.com/deckarep/golang-set/v2"

	"github.com/towns-protocol/towns/core/node/app_registry/types"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// Isolation Level Strategy for AppRegistry Store
//
// The AppRegistry maintains a critical invariant: messages exist in enqueued_messages
// IF AND ONLY IF no decryption key exists in app_session_keys for that (device_key, session_id) pair.
//
// Operations are divided into two categories:
//
// 1. SERIALIZABLE (default): Required for queue operations
//    - EnqueueUnsendableMessages: Reads app_session_keys, writes to enqueued_messages
//    - PublishSessionKeys: Writes to app_session_keys, deletes from enqueued_messages
//
// 2. READ COMMITTED: Safe for non-queue operations
//    - CreateApp, UpdateSettings, RotateSecret, SetAppMetadata, SetAppMetadataPartial: Simple field updates
//    - RegisterWebhook: Updates device_key (can only succeed if no queue entries exist)
//    - GetAppInfo, GetAppMetadata, IsUsernameAvailable: Read-only operations
//
// All operations use lockApp() to establish consistent lock ordering and prevent deadlocks.

var isoLevelReadCommitted = pgx.ReadCommitted

type (
	PostgresAppRegistryStore struct {
		PostgresEventStore

		exitSignal chan error
	}

	EncryptionDevice struct {
		DeviceKey   string
		FallbackKey string
	}

	// When this is returned, caller already has access to the device key and the
	// group encryption sessions envelope. They can combine these with the information
	// returned in this struct to form the following tuple needed for each app to send
	// a message, which is:
	// (webhookUrl, encryption_envelope, encryptedSharedSecret, messageEnvelope)
	// where:
	// - webhookUrl is the URL address of the bot service
	// - encryption_envelope is binary of the envelope of the group encryption sessions
	//   event found in the app's user inbox stream which contains the encrypted ciphertext
	//   needed for the bot server to decrypt the stream event.
	// - encryptedSharedSecret is the shared hmac secret used by the app registry server
	//   to sign jwt tokens for authentication of origination of webhook calls. To be useful,
	//   it must be decrypted with the app registry service's in-memory data encryption key.
	// - messageEnvelopes is an array of serialized channel message payload stream event envelopes
	//   that can all be send with the same group encryption sessions message as a set
	//   of decryption keys.
	SendableMessages struct {
		AppId                 common.Address // included here for logging / metrics
		EncryptedSharedSecret [32]byte
		WebhookUrl            string
		MessageEnvelopes      [][]byte
	}

	// When SendableApp is returned, the caller has access to the session id and
	// stream event binary already. Return
	// (appId, deviceKey, encryptedSharedSecret, ciphertext)
	SendableApp struct {
		AppId              common.Address
		DeviceKey          string
		WebhookUrl         string
		SendMessageSecrets SendMessageSecrets
	}

	// UnsendableApp is returned to supply all information needed for the caller to request
	// a key solicitation if a message could not be forwarded due to missing decryption keys.
	// In this case, the caller has access to the session id and stream id already. Return
	// (appId, deviceKey, webhookUrl, encryptedSharedSecret) to make an authenticated call
	// to the bot to solicit keys for the missing session id(s) in the stream.
	UnsendableApp struct {
		AppId                 common.Address
		DeviceKey             string
		WebhookUrl            string
		EncryptedSharedSecret [32]byte
	}

	// We send entire group encryption sessions envelopes to the bot server to use as decryption
	// material. The encrypted shared secret must be decrypted with the in-memory data decryption
	// key in order to be used to sign jwt tokens for the bot server.
	SendMessageSecrets struct {
		EncryptionEnvelope    []byte
		EncryptedSharedSecret [32]byte
	}

	AppInfo struct {
		App              common.Address
		Owner            common.Address
		EncryptedSecret  [32]byte
		Settings         types.AppSettings
		Metadata         types.AppMetadata
		WebhookUrl       string
		EncryptionDevice EncryptionDevice
		Active           bool
	}

	AppRegistryStore interface {
		// Note: the shared secret passed into this method call is stored directly on disk and
		// therefore should always be encrypted using the service's configured data encryption key.
		CreateApp(
			ctx context.Context,
			owner common.Address,
			app common.Address,
			settings types.AppSettings,
			metadata types.AppMetadata,
			encryptedSharedSecret [32]byte,
		) error

		// Note: the shared secret passed into this method call is stored directly on disk and
		// therefore should always be encrypted using the service's configured data encryption key.
		RotateSecret(
			ctx context.Context,
			app common.Address,
			encryptedSharedSecret [32]byte,
		) error

		UpdateSettings(
			ctx context.Context,
			app common.Address,
			settings types.AppSettings,
		) error

		RegisterWebhook(
			ctx context.Context,
			app common.Address,
			webhook string,
			deviceKey string,
			fallbackKey string,
		) error

		GetAppInfo(
			ctx context.Context,
			app common.Address,
		) (*AppInfo, error)

		GetSendableApps(
			ctx context.Context,
			apps []common.Address,
		) (sendableDevices []SendableApp, err error)

		// PublishSessionKeys creates a row with the group encryption sessions envelope and list of
		// session ids for the device key, and returns all enqueued messages that become sendable now
		// that these session keys are available. If no keys become sendable, messages is nil.
		PublishSessionKeys(
			ctx context.Context,
			streamId shared.StreamId,
			deviceKey string,
			sessionIds []string,
			encryptionEnvelope []byte,
		) (messages *SendableMessages, err error)

		// EnqueueUnsendableMessages enqueues the message to be sent for all devices that do not yet
		// have a session key stored for this session. It returns the set of all devices
		// that can be sent to because they do have the session key, along with the session
		// key and encrypted shared secret for jwt token generation.
		EnqueueUnsendableMessages(
			ctx context.Context,
			appIds []common.Address,
			sessionId string,
			envelopeBytes []byte,
		) (sendableDevices []SendableApp, unsendableDevices []UnsendableApp, err error)

		// GetSessionKey returns the envelope of the encrypted sessions message for the specified
		// app that contains the encrypted ciphertext for the given session id, if it exists.
		GetSessionKey(
			ctx context.Context,
			app common.Address,
			sessionId string,
		) (encryptionEnvelope []byte, err error)

		// GetSessionKeyForStream returns the envelope of the encrypted sessions message for the specified
		// app that contains the encrypted ciphertext for the given stream, if it exists.
		GetSessionKeyForStream(
			ctx context.Context,
			app common.Address,
			streamId shared.StreamId,
		) (encryptionEnvelope []byte, err error)

		// SetAppMetadata sets the metadata for an app
		SetAppMetadata(
			ctx context.Context,
			app common.Address,
			metadata types.AppMetadata,
		) error

		// SetAppMetadataPartial performs a partial update with optimistic locking
		SetAppMetadataPartial(
			ctx context.Context,
			app common.Address,
			updates map[string]interface{}, // field updates
		) error

		// GetAppMetadata gets the metadata for an app
		GetAppMetadata(
			ctx context.Context,
			app common.Address,
		) (*types.AppMetadata, error)

		// IsUsernameAvailable checks if a username is available (case-sensitive)
		IsUsernameAvailable(
			ctx context.Context,
			username string,
		) (bool, error)

		// SetAppActiveStatus updates the active status of an app.
		// Only the app owner or app itself should be allowed to change this.
		SetAppActiveStatus(
			ctx context.Context,
			app common.Address,
			active bool,
		) error

		// GetAllActiveBotAddresses returns all active bot addresses registered in the app registry
		GetAllActiveBotAddresses(ctx context.Context) ([]common.Address, error)
	}
)

// PGAddress is a type alias for addresses that automatically serializes and deserializes
// 20-byte addresses into and out of pg fixed-length character sequences.
type PGAddress common.Address

func (pa PGAddress) TextValue() (pgtype.Text, error) {
	return pgtype.Text{
		String: hex.EncodeToString(pa[:]),
		Valid:  true,
	}, nil
}

func (pa *PGAddress) ScanText(v pgtype.Text) error {
	if !v.Valid {
		*pa = PGAddress{}
		return nil
	}
	*pa = (PGAddress(common.HexToAddress(v.String)))
	return nil
}

// PGSecret is a type alias for 32-length byte arrays that automatically serializes and deserializes
// these shared secrets into and out of pg fixed-length character sequences.
type PGSecret [32]byte

func (pa PGSecret) TextValue() (pgtype.Text, error) {
	return pgtype.Text{
		String: hex.EncodeToString(pa[:]),
		Valid:  true,
	}, nil
}

func (pa *PGSecret) ScanText(v pgtype.Text) error {
	if !v.Valid {
		*pa = PGSecret{}
		return nil
	}
	bytes, err := hex.DecodeString(v.String)
	if err != nil {
		return err
	}
	if len(bytes) != 32 {
		return fmt.Errorf("expected hex-encoded db string to decode into 32 bytes")
	}
	*pa = (PGSecret(bytes))
	return nil
}

var _ AppRegistryStore = (*PostgresAppRegistryStore)(nil)

//go:embed app_registry_migrations/*.sql
var AppRegistryDir embed.FS

func DbSchemaNameForAppRegistryService(appServiceId string) string {
	return fmt.Sprintf("app_%s", hex.EncodeToString([]byte(appServiceId)))
}

// NewPostgresAppRegistryStore instantiates a new PostgreSQL persistent storage for the app registry service.
// This implementation requires isolation level of at least serializable in order for the queueing
// functionality to work as expected.
func NewPostgresAppRegistryStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) (*PostgresAppRegistryStore, error) {
	store := &PostgresAppRegistryStore{}
	if err := store.Init(ctx, poolInfo, exitSignal, metrics); err != nil {
		return nil, err
	}

	return store, nil
}

func (s *PostgresAppRegistryStore) Init(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) error {
	s.exitSignal = exitSignal

	if err := s.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		nil,
		&AppRegistryDir,
		"app_registry_migrations",
	); err != nil {
		return AsRiverError(err).Func("PostgresAppRegistryStore.Init")
	}

	if err := s.initStorage(ctx); err != nil {
		return AsRiverError(err).Func("PostgresAppRegistryStore.Init")
	}

	return nil
}

func (s *PostgresAppRegistryStore) CreateApp(
	ctx context.Context,
	owner common.Address,
	app common.Address,
	settings types.AppSettings,
	metadata types.AppMetadata,
	encryptedSharedSecret [32]byte,
) error {
	return s.txRunner(
		ctx,
		"CreateApp",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createApp(ctx, owner, app, settings, metadata, encryptedSharedSecret, tx)
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
		"ownerAddress", owner,
		"settings", settings,
		"metadata", metadata,
	)
}

func (s *PostgresAppRegistryStore) createApp(
	ctx context.Context,
	owner common.Address,
	app common.Address,
	settings types.AppSettings,
	metadata types.AppMetadata,
	encryptedSharedSecret [32]byte,
	txn pgx.Tx,
) error {
	// Marshal metadata to JSON (Name field is omitted via json:"-" tag)
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return AsRiverError(err, protocol.Err_INTERNAL).
			Message("Unable to marshal app metadata to JSON")
	}

	if _, err := txn.Exec(
		ctx,
		"insert into app_registry (app_id, app_owner_id, encrypted_shared_secret, forward_setting, username, app_metadata) values ($1, $2, $3, $4, $5, $6);",
		PGAddress(app),
		PGAddress(owner),
		PGSecret(encryptedSharedSecret),
		int16(settings.ForwardSetting),
		// We store the username in a separate column from the metadata so we can guarantee unique bot
		// usernames. Therefore, the username field is removed from the JSON output of the app metadata struct,
		// and is stored separately in its own column.
		metadata.Username,
		string(metadataJSON),
	); err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			if strings.Contains(err.Error(), "app_registry_username_idx") {
				return WrapRiverError(
					protocol.Err_ALREADY_EXISTS,
					err,
				).Message("another app with the same username already exists")
			}
			return WrapRiverError(protocol.Err_ALREADY_EXISTS, err).Message("app already exists")
		} else {
			return WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).Message("unable to create app record")
		}
	}
	return nil
}

func (s *PostgresAppRegistryStore) UpdateSettings(
	ctx context.Context,
	app common.Address,
	settings types.AppSettings,
) error {
	return s.txRunner(
		ctx,
		"UpdateSettings",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.updateSettings(ctx, app, settings, tx)
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
		"settings", settings,
	)
}

func (s *PostgresAppRegistryStore) updateSettings(
	ctx context.Context,
	app common.Address,
	settings types.AppSettings,
	txn pgx.Tx,
) error {
	tag, err := txn.Exec(
		ctx,
		`UPDATE app_registry SET forward_setting = $2 WHERE app_id = $1`,
		PGAddress(app),
		int16(settings.ForwardSetting),
	)
	if err != nil {
		return AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).
			Message("Unable to update the forward setting for app")
	}
	if tag.RowsAffected() < 1 {
		return RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
	}

	return nil
}

func (s *PostgresAppRegistryStore) RotateSecret(
	ctx context.Context,
	app common.Address,
	encryptedSharedSecret [32]byte,
) error {
	return s.txRunner(
		ctx,
		"RotateSecret",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.rotateSecret(ctx, app, encryptedSharedSecret, tx)
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
	)
}

func (s *PostgresAppRegistryStore) rotateSecret(
	ctx context.Context,
	app common.Address,
	encryptedSharedSecret [32]byte,
	txn pgx.Tx,
) error {
	tag, err := txn.Exec(
		ctx,
		`UPDATE app_registry SET encrypted_shared_secret = $2 WHERE app_id = $1`,
		PGAddress(app),
		PGSecret(encryptedSharedSecret),
	)
	if err != nil {
		return AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).
			Message("Unable to update the encrypted shared secret for app")
	}
	if tag.RowsAffected() < 1 {
		return RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
	}

	return nil
}

func (s *PostgresAppRegistryStore) RegisterWebhook(
	ctx context.Context,
	app common.Address,
	webhook string,
	deviceKey string,
	fallbackKey string,
) error {
	return s.txRunner(
		ctx,
		"RegisterWebhook",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.registerWebhook(ctx, app, webhook, deviceKey, fallbackKey, tx)
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
		"webhook", webhook,
		"deviceKey", deviceKey,
		"fallbackKey", fallbackKey,
	)
}

func (s *PostgresAppRegistryStore) registerWebhook(
	ctx context.Context,
	app common.Address,
	webhook string,
	deviceKey string,
	fallbackKey string,
	txn pgx.Tx,
) error {
	tag, err := txn.Exec(
		ctx,
		`UPDATE app_registry SET webhook = $2, device_key = $3, fallback_key = $4 WHERE app_id = $1`,
		PGAddress(app),
		webhook,
		deviceKey,
		fallbackKey,
	)
	if err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			return WrapRiverError(protocol.Err_ALREADY_EXISTS, err).Message("another app is using this device id")
		}
		return AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE).Message("error updating app webhook")
	}

	if tag.RowsAffected() < 1 {
		return RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
	}

	return nil
}

func (s *PostgresAppRegistryStore) GetAppInfo(
	ctx context.Context,
	app common.Address,
) (
	appInfo *AppInfo,
	err error,
) {
	err = s.txRunner(
		ctx,
		"GetAppInfo",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			appInfo, err = s.getAppInfo(ctx, app, tx)
			return err
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
	)
	if err != nil {
		return nil, err
	}
	return appInfo, nil
}

func (s *PostgresAppRegistryStore) getAppInfo(
	ctx context.Context,
	appAddr common.Address,
	tx pgx.Tx,
) (
	*AppInfo,
	error,
) {
	var owner, app PGAddress
	var encryptedSecret PGSecret
	app = PGAddress(appAddr)
	var appInfo AppInfo
	var metadataJSON string
	var username string
	if err := tx.QueryRow(
		ctx,
		`
		    SELECT app_id, app_owner_id, encrypted_shared_secret, forward_setting, app_metadata, username,
			    COALESCE(webhook, ''), COALESCE(device_key, ''), COALESCE(fallback_key, ''), active
		    FROM app_registry WHERE app_id = $1
		`,
		app,
	).Scan(
		&app,
		&owner,
		&encryptedSecret,
		&appInfo.Settings.ForwardSetting,
		&metadataJSON,
		&username,
		&appInfo.WebhookUrl,
		&appInfo.EncryptionDevice.DeviceKey,
		&appInfo.EncryptionDevice.FallbackKey,
		&appInfo.Active,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
		} else {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("failed to find app in registry")
		}
	} else {
		appInfo.App = common.BytesToAddress(app[:])
		appInfo.Owner = common.BytesToAddress(owner[:])
		appInfo.EncryptedSecret = encryptedSecret

		// Parse metadata JSON and apply the username field from its separate column.
		// The metadata JSON will not have a Username field defined, as it is omitted from
		// the json serialization of the object. DisplayName is stored within the JSON.
		if err := json.Unmarshal([]byte(metadataJSON), &appInfo.Metadata); err != nil {
			return nil, AsRiverError(err, protocol.Err_INTERNAL).
				Message("Unable to unmarshal app metadata from JSON")
		}
		appInfo.Metadata.Username = username
	}
	return &appInfo, nil
}

func (s *PostgresAppRegistryStore) PublishSessionKeys(
	ctx context.Context,
	streamId shared.StreamId,
	deviceKey string,
	sessionIds []string,
	encryptionEnvelope []byte,
) (messages *SendableMessages, err error) {
	err = s.txRunner(
		ctx,
		"PublishSessionKey",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			messages, err = s.publishSessionKeys(ctx, streamId, deviceKey, sessionIds, encryptionEnvelope, tx)
			return err
		},
		nil,
		"deviceKey", deviceKey,
		"sessionIds", sessionIds,
		"streamId", streamId,
	)
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (s *PostgresAppRegistryStore) publishSessionKeys(
	ctx context.Context,
	streamId shared.StreamId,
	deviceKey string,
	sessionIds []string,
	encryptionEnvelope []byte,
	tx pgx.Tx,
) (messages *SendableMessages, err error) {
	_, err = tx.Exec(
		ctx,
		`   INSERT INTO app_session_keys (device_key, stream_id, session_ids, message_envelope)
			VALUES ($1, $2, $3, $4);	
		`,
		deviceKey,
		streamId,
		sessionIds,
		encryptionEnvelope,
	)
	if err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			return nil, WrapRiverError(
				protocol.Err_ALREADY_EXISTS,
				err,
			).Message("session key for device already exists")
		} else if isPgError(err, pgerrcode.ForeignKeyViolation) {
			return nil, WrapRiverError(
				protocol.Err_NOT_FOUND,
				err,
			).Message("device is not registered")
		} else {
			return nil, WrapRiverError(
				protocol.Err_DB_OPERATION_FAILURE,
				err,
			).Message("unable to register session key for device")
		}
	}

	messages = &SendableMessages{}
	var message []byte
	rows, err := tx.Query(
		ctx,
		`
		    DELETE FROM enqueued_messages
			WHERE device_key = $1
			AND session_id = ANY($2)
			RETURNING message_envelope;
		`,
		deviceKey,
		sessionIds,
	)
	if err != nil {
		return nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("could not delete messages that are now sendable")
	}

	if _, err := pgx.ForEachRow(
		rows,
		[]any{&message},
		func() error {
			messages.MessageEnvelopes = append(messages.MessageEnvelopes, message)
			return nil
		},
	); err != nil {
		return nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to scan from sendable messages")
	}
	if len(messages.MessageEnvelopes) == 0 {
		return nil, nil
	}

	var appId PGAddress
	var encryptedSecret PGSecret
	if err = tx.QueryRow(
		ctx,
		"select app_id, encrypted_shared_secret, webhook from app_registry where device_key = $1",
		deviceKey,
	).Scan(&appId, &encryptedSecret, &messages.WebhookUrl); err != nil {
		// This should never happen as the constraint on inserting into app_session_keys
		// should require an app with this device key to exist.
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(
				protocol.Err_NOT_FOUND,
				"Registered app with device key not found",
			)
		} else {
			return nil, WrapRiverError(
				protocol.Err_DB_OPERATION_FAILURE,
				err,
			).Message("unable to retrieved encrypted shared secret for app")
		}
	}
	messages.AppId = common.Address(appId)
	messages.EncryptedSharedSecret = encryptedSecret

	return messages, nil
}

func (s *PostgresAppRegistryStore) GetSessionKey(
	ctx context.Context,
	app common.Address,
	sessionId string,
) (encryptionEnvelope []byte, err error) {
	err = s.txRunner(
		ctx,
		"GetSessionKeys",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			encryptionEnvelope, err = s.getSessionKey(ctx, app, sessionId, tx)
			return err
		},
		nil,
		"app", app,
		"sessionId", sessionId,
	)
	if err != nil {
		return nil, err
	}
	return encryptionEnvelope, nil
}

func (s *PostgresAppRegistryStore) GetSessionKeyForStream(
	ctx context.Context,
	app common.Address,
	streamId shared.StreamId,
) (encryptionEnvelope []byte, err error) {
	err = s.txRunner(
		ctx,
		"GetSessionKeys",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			encryptionEnvelope, err = s.getSessionKeyForStream(ctx, app, streamId, tx)
			return err
		},
		nil,
		"app", app,
		"streamId", streamId,
	)
	if err != nil {
		return nil, err
	}
	return encryptionEnvelope, nil
}

func (s *PostgresAppRegistryStore) getSessionKey(
	ctx context.Context,
	app common.Address,
	sessionId string,
	tx pgx.Tx,
) (encryptionEnvelope []byte, err error) {
	if err = tx.QueryRow(
		ctx,
		`
		SELECT message_envelope FROM app_registry
		INNER JOIN app_session_keys
		ON app_registry.device_key = app_session_keys.device_key
		AND app_registry.app_id = $1
		AND $2 = ANY(app_session_keys.session_ids)
		LIMIT 1;
		`,
		PGAddress(app),
		sessionId,
	).Scan(&encryptionEnvelope); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "session key for app not found")
		} else {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("Unable to find session key for app")
		}
	}
	return encryptionEnvelope, nil
}

func (s *PostgresAppRegistryStore) getSessionKeyForStream(
	ctx context.Context,
	app common.Address,
	streamId shared.StreamId,
	tx pgx.Tx,
) (encryptionEnvelope []byte, err error) {
	if err = tx.QueryRow(
		ctx,
		`
		SELECT message_envelope FROM app_registry
		INNER JOIN app_session_keys
		ON app_registry.device_key = app_session_keys.device_key
		AND app_registry.app_id = $1
		AND $2 = app_session_keys.stream_id
		LIMIT 1;
		`,
		PGAddress(app),
		streamId,
	).Scan(&encryptionEnvelope); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "session key for app for stream not found")
		} else {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("Unable to find session key for app for stream")
		}
	}
	return encryptionEnvelope, nil
}

func (s *PostgresAppRegistryStore) GetSendableApps(
	ctx context.Context,
	apps []common.Address,
) (sendableDevices []SendableApp, err error) {
	err = s.txRunner(
		ctx,
		"GetSendableApps",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			sendableDevices, err = s.getSendableApps(ctx, apps, tx)
			return err
		},
		nil,
		"apps", apps,
	)
	if err != nil {
		return nil, err
	}
	return sendableDevices, nil
}

func (s *PostgresAppRegistryStore) getSendableApps(
	ctx context.Context,
	apps []common.Address,
	tx pgx.Tx,
) (sendableApps []SendableApp, err error) {
	if len(apps) == 0 {
		return sendableApps, nil
	}

	rows, err := tx.Query(
		ctx,
		`   
		    SELECT app_id, device_key, webhook, encrypted_shared_secret
			FROM app_registry
			WHERE app_id = ANY($1) AND active = true
		`,
		addressesToStrings(apps),
	)
	if err != nil {
		return nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to get sending information for existing devices")
	}

	var appId PGAddress
	var deviceKey, webhookUrl string
	var encryptedSharedSecret PGSecret
	if _, err := pgx.ForEachRow(
		rows,
		[]any{&appId, &deviceKey, &webhookUrl, &encryptedSharedSecret},
		func() error {
			if webhookUrl == "" {
				return RiverError(protocol.Err_INTERNAL, "App has no registered webhook and is not sendable").Tag("unsendableApp", appId)
			}
			sendableApps = append(sendableApps, SendableApp{
				AppId:      common.Address(appId),
				DeviceKey:  deviceKey,
				WebhookUrl: webhookUrl,
				SendMessageSecrets: SendMessageSecrets{
					EncryptedSharedSecret: encryptedSharedSecret,
				},
			})
			return nil
		},
	); err != nil {
		return nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to scan the app_registry")
	}

	if len(sendableApps) < len(apps) {
		return nil, RiverError(protocol.Err_NOT_FOUND, "some apps were not found the registry")
	}

	return sendableApps, nil
}

func (s *PostgresAppRegistryStore) EnqueueUnsendableMessages(
	ctx context.Context,
	appIds []common.Address,
	sessionId string,
	envelopeBytes []byte,
) (sendableDevices []SendableApp, unsendableDevices []UnsendableApp, err error) {
	if err = s.txRunner(
		ctx,
		"EnqueueUnsendableMessages",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			sendableDevices, unsendableDevices, err = s.enqueueUnsendableMessages(ctx, appIds, sessionId, envelopeBytes, tx)
			return err
		},
		nil,
		"appIds", appIds,
		"sessionId", sessionId,
	); err != nil {
		return nil, nil, err
	}
	return sendableDevices, unsendableDevices, nil
}

func addressesToStrings(addresses []common.Address) []string {
	ret := make([]string, len(addresses))
	for i, addr := range addresses {
		ret[i] = hex.EncodeToString(addr[:])
	}
	return ret
}

func (s *PostgresAppRegistryStore) enqueueUnsendableMessages(
	ctx context.Context,
	appIds []common.Address,
	sessionId string,
	envelopeBytes []byte,
	tx pgx.Tx,
) (sendableApps []SendableApp, unsendableApps []UnsendableApp, err error) {
	rows, err := tx.Query(
		ctx,
		`   
		    SELECT DISTINCT on (app_registry.app_id)
		      app_registry.app_id,
			  app_registry.device_key,
			  app_registry.webhook,
			  app_registry.encrypted_shared_secret,
			  app_session_keys.message_envelope
			FROM app_registry
			INNER JOIN app_session_keys
			  ON app_registry.device_key = app_session_keys.device_key
			  AND app_registry.app_id = ANY($2)
			  AND app_registry.active = true
			  AND $1 = ANY(app_session_keys.session_ids)
			ORDER BY app_registry.app_id, app_session_keys.session_ids
		`,
		sessionId,
		addressesToStrings(appIds),
	)
	if err != nil {
		return nil, nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to get existing session keys for devices")
	}
	sendableApps = make([]SendableApp, 0)
	sendableAppIds := mapset.NewSet[common.Address]()

	var sendableDevice SendableApp
	var appId PGAddress
	var encryptedSharedSecret PGSecret
	if _, err := pgx.ForEachRow(
		rows,
		[]any{&appId, &sendableDevice.DeviceKey, &sendableDevice.WebhookUrl, &encryptedSharedSecret, &sendableDevice.SendMessageSecrets.EncryptionEnvelope},
		func() error {
			sendableDevice.AppId = common.Address(appId)
			sendableDevice.SendMessageSecrets.EncryptedSharedSecret = encryptedSharedSecret
			sendableApps = append(sendableApps, sendableDevice)
			sendableAppIds.Add(sendableDevice.AppId)
			return nil
		},
	); err != nil {
		return nil, nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to get existing keys for devices")
	}

	unsendableAppIds := make([]common.Address, 0, len(appIds)-len(sendableApps))
	for _, appId := range appIds {
		if !sendableAppIds.Contains(appId) {
			unsendableAppIds = append(unsendableAppIds, appId)
		}
	}

	rows, err = tx.Query(
		ctx,
		`   SELECT app_id, device_key, webhook, encrypted_shared_secret
		    FROM app_registry
		    WHERE app_id = ANY($1) AND active = true
		`,
		addressesToStrings(unsendableAppIds),
	)
	if err != nil {
		return nil, nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to get app metadata for unsendable devices")
	}
	nextRow := 0
	var deviceId string
	var webhook string
	unsendableApps = make([]UnsendableApp, len(unsendableAppIds))
	if _, err := pgx.ForEachRow(rows, []any{&appId, &deviceId, &webhook, &encryptedSharedSecret}, func() error {
		unsendableApps[nextRow].AppId = common.Address(appId)
		unsendableApps[nextRow].DeviceKey = deviceId
		unsendableApps[nextRow].WebhookUrl = webhook
		unsendableApps[nextRow].EncryptedSharedSecret = encryptedSharedSecret
		nextRow += 1
		return nil
	}); err != nil {
		return nil, nil, AsRiverError(
			err,
			protocol.Err_DB_OPERATION_FAILURE,
		).Message("error streaming app metadata for unsendable devices")
	}
	if len(unsendableAppIds) > nextRow {
		return nil, nil, RiverError(protocol.Err_NOT_FOUND, "some apps were not found in the registry")
	}

	// Insert unsendable messages
	nextRow = 0
	insertCount, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{"enqueued_messages"},
		[]string{"device_key", "session_id", "message_envelope"},
		pgx.CopyFromFunc(func() ([]interface{}, error) {
			if nextRow >= len(unsendableApps) {
				return nil, nil
			}

			row := []interface{}{unsendableApps[nextRow].DeviceKey, sessionId, envelopeBytes}
			nextRow++
			return row, nil
		}),
	)
	if err != nil {
		// This foreign key violation should be pretty much impossible since we read the device key
		// from an existing app_registry row above.
		if isPgError(err, pgerrcode.ForeignKeyViolation) {
			return nil, nil, WrapRiverError(protocol.Err_NOT_FOUND, err).Message(
				"unable to enqueue messages for session - app with device key is not registered",
			).Tag("deviceKey", unsendableApps[nextRow-1].DeviceKey)
		} else {
			return nil, nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).Message(
				"unable to enqueue messages for session",
			).Tag("unsendableAppIds", unsendableAppIds)
		}
	}
	if insertCount < int64(len(unsendableAppIds)) {
		return nil, nil, RiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			"Could not enqueue all unsendable messages for session",
		)
	}

	return sendableApps, unsendableApps, nil
}

// Close closes the postgres connection pool
func (s *PostgresAppRegistryStore) Close(ctx context.Context) {
	s.PostgresEventStore.Close(ctx)
}

func (s *PostgresAppRegistryStore) SetAppMetadata(
	ctx context.Context,
	app common.Address,
	metadata types.AppMetadata,
) error {
	return s.txRunner(
		ctx,
		"SetAppMetadata",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setAppMetadata(ctx, app, metadata, tx)
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
		"metadata", metadata,
	)
}

func (s *PostgresAppRegistryStore) SetAppMetadataPartial(
	ctx context.Context,
	app common.Address,
	updates map[string]interface{},
) error {
	return s.txRunner(
		ctx,
		"SetAppMetadataPartial",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			_, err := s.setAppMetadataPartial(ctx, app, updates, tx)
			return err
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
		"updates", updates,
	)
}

func (s *PostgresAppRegistryStore) setAppMetadata(
	ctx context.Context,
	app common.Address,
	metadata types.AppMetadata,
	txn pgx.Tx,
) error {
	// Marshal metadata to JSON (Username field is omitted via json:"-" tag)
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return AsRiverError(err, protocol.Err_INTERNAL).
			Message("Unable to marshal app metadata to JSON").
			Tag("metadata", metadata).Tag("username", metadata.Username)
	}

	tag, err := txn.Exec(
		ctx,
		`UPDATE app_registry SET app_metadata = $2, username = $3 WHERE app_id = $1`,
		PGAddress(app),
		string(metadataJSON),
		// We store the username in a separate column so we can guarantee unique bot usernames.
		// The Username field is omitted from the serialized JSON, so there is no duplication here.
		metadata.Username,
	)
	if err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			return WrapRiverError(
				protocol.Err_ALREADY_EXISTS,
				err,
			).Message("another app with the same username already exists")
		} else {
			return RiverErrorWithBase(protocol.Err_DB_OPERATION_FAILURE, "unable to update the app metadata", err)
		}
	}
	if tag.RowsAffected() < 1 {
		return RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
	}

	return nil
}

func (s *PostgresAppRegistryStore) setAppMetadataPartial(
	ctx context.Context,
	app common.Address,
	updates map[string]interface{},
	tx pgx.Tx,
) (int32, error) {
	// 1. Lock and read current data (including version)
	var metadataJSON string
	var username string
	var currentVersion int32

	err := tx.QueryRow(ctx,
		`SELECT app_metadata, username, version FROM app_registry 
         WHERE app_id = $1 FOR UPDATE`,
		PGAddress(app)).Scan(&metadataJSON, &username, &currentVersion)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
		}
		return 0, AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE)
	}

	// 2. Parse current metadata
	var currentMetadata types.AppMetadata
	if err := json.Unmarshal([]byte(metadataJSON), &currentMetadata); err != nil {
		return 0, AsRiverError(err, protocol.Err_INTERNAL).Message("Unable to unmarshal app metadata")
	}
	currentMetadata.Username = username

	// 3. Apply updates to current data
	updatedMetadata := s.applyUpdates(currentMetadata, updates)

	// 4. Marshal updated metadata
	updatedJSON, err := json.Marshal(updatedMetadata)
	if err != nil {
		return 0, AsRiverError(err, protocol.Err_INTERNAL).Message("Unable to marshal updated metadata")
	}

	// 5. Write back with incremented version, using current version in WHERE clause
	newVersion := currentVersion + 1
	result, err := tx.Exec(ctx,
		`UPDATE app_registry 
         SET app_metadata = $2, username = $3, version = $4 
         WHERE app_id = $1 AND version = $5`,
		PGAddress(app),
		string(updatedJSON),
		updatedMetadata.Username,
		newVersion,
		currentVersion) // Use the version we just read
	if err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			return 0, WrapRiverError(protocol.Err_ALREADY_EXISTS, err).
				Message("another app with the same username already exists")
		}
		return 0, AsRiverError(err, protocol.Err_DB_OPERATION_FAILURE)
	}

	// 6. Check if update succeeded (row existed with expected version)
	if result.RowsAffected() == 0 {
		return 0, RiverError(protocol.Err_ABORTED,
			"metadata was modified by another process (version mismatch)")
	}

	return newVersion, nil
}

// applyUpdates applies the field updates to the current metadata
func (s *PostgresAppRegistryStore) applyUpdates(
	current types.AppMetadata,
	updates map[string]interface{},
) types.AppMetadata {
	updated := current // Copy current metadata

	for field, value := range updates {
		switch field {
		case "username":
			if str, ok := value.(string); ok {
				updated.Username = str
			}
		case "display_name":
			if str, ok := value.(string); ok {
				updated.DisplayName = str
			}
		case "description":
			if str, ok := value.(string); ok {
				updated.Description = str
			}
		case "image_url":
			if str, ok := value.(string); ok {
				updated.ImageUrl = str
			}
		case "avatar_url":
			if str, ok := value.(string); ok {
				updated.AvatarUrl = str
			}
		case "external_url":
			if str, ok := value.(string); ok {
				updated.ExternalUrl = str
			}
		case "slash_commands":
			if commands, ok := value.([]types.SlashCommand); ok {
				updated.SlashCommands = commands
			}
		case "motto":
			if value == nil {
				updated.Motto = ""
			} else if str, ok := value.(string); ok {
				updated.Motto = str
			}
		}
	}

	return updated
}

func (s *PostgresAppRegistryStore) GetAppMetadata(
	ctx context.Context,
	app common.Address,
) (*types.AppMetadata, error) {
	var metadata *types.AppMetadata
	err := s.txRunner(
		ctx,
		"GetAppMetadata",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			metadata, err = s.getAppMetadata(ctx, app, tx)
			return err
		},
		nil,
		"appAddress", app,
	)
	if err != nil {
		return nil, err
	}
	return metadata, nil
}

func (s *PostgresAppRegistryStore) getAppMetadata(
	ctx context.Context,
	app common.Address,
	tx pgx.Tx,
) (*types.AppMetadata, error) {
	var metadataJSON string
	var username string
	if err := tx.QueryRow(
		ctx,
		`SELECT app_metadata, username FROM app_registry WHERE app_id = $1`,
		PGAddress(app),
	).Scan(&metadataJSON, &username); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
		} else {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("failed to find app metadata in registry")
		}
	}

	var metadata types.AppMetadata
	if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
		return nil, AsRiverError(err, protocol.Err_INTERNAL).
			Message("Unable to unmarshal app metadata from JSON")
	}
	// Set the Username field from its separate column.
	// DisplayName is already in the metadata JSON.
	metadata.Username = username

	return &metadata, nil
}

func (s *PostgresAppRegistryStore) IsUsernameAvailable(
	ctx context.Context,
	username string,
) (bool, error) {
	var exists bool
	err := s.txRunner(
		ctx,
		"IsUsernameAvailable",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(
				ctx,
				"SELECT EXISTS(SELECT 1 FROM app_registry WHERE username = $1)",
				username,
			).Scan(&exists)
		},
		nil,
		"username", username,
	)
	if err != nil {
		return false, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to check username availability")
	}
	return !exists, nil
}

func (s *PostgresAppRegistryStore) SetAppActiveStatus(
	ctx context.Context,
	app common.Address,
	active bool,
) error {
	return s.txRunner(
		ctx,
		"SetAppActiveStatus",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.setAppActiveStatus(ctx, app, active, tx)
		},
		&txRunnerOpts{overrideIsolationLevel: &isoLevelReadCommitted},
		"appAddress", app,
		"active", active,
	)
}

func (s *PostgresAppRegistryStore) setAppActiveStatus(
	ctx context.Context,
	app common.Address,
	active bool,
	tx pgx.Tx,
) error {
	// Update the active status and increment version for optimistic locking
	tag, err := tx.Exec(
		ctx,
		`UPDATE app_registry
		 SET active = $2, version = version + 1
		 WHERE app_id = $1`,
		PGAddress(app),
		active,
	)
	if err != nil {
		return WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to update app active status")
	}

	if tag.RowsAffected() == 0 {
		return RiverError(protocol.Err_NOT_FOUND, "app not found in registry").
			Tag("appId", app)
	}

	return nil
}

// GetAllActiveBotAddresses returns all active bot addresses registered in the app registry
func (s *PostgresAppRegistryStore) GetAllActiveBotAddresses(ctx context.Context) ([]common.Address, error) {
	var addresses []common.Address

	rows, err := s.pool.Query(
		ctx,
		`SELECT app_id FROM app_registry WHERE active = true`,
	)
	if err != nil {
		return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to fetch active bot addresses")
	}
	defer rows.Close()

	var appId PGAddress
	for rows.Next() {
		if err := rows.Scan(&appId); err != nil {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("failed to scan bot address")
		}
		addresses = append(addresses, common.Address(appId))
	}

	if err := rows.Err(); err != nil {
		return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("error iterating bot addresses")
	}

	return addresses, nil
}
