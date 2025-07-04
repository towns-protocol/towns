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

		// SetAppMetadata sets the metadata for an app
		SetAppMetadata(
			ctx context.Context,
			app common.Address,
			metadata types.AppMetadata,
		) error

		// GetAppMetadata gets the metadata for an app
		GetAppMetadata(
			ctx context.Context,
			app common.Address,
		) (*types.AppMetadata, error)

		// IsDisplayNameAvailable checks if a display name is available (case-sensitive)
		IsDisplayNameAvailable(
			ctx context.Context,
			displayName string,
		) (bool, error)
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
		nil,
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
		"insert into app_registry (app_id, app_owner_id, encrypted_shared_secret, forward_setting, display_name, app_metadata) values ($1, $2, $3, $4, $5, $6);",
		PGAddress(app),
		PGAddress(owner),
		PGSecret(encryptedSharedSecret),
		int16(settings.ForwardSetting),
		// We store the name in a separate column from the metadata so we can guarantee unique bot diplay
		// names. Therefore, the name field is removed from the JSON output of the app metadata struct,
		// and is stored separately in its own column.
		metadata.Name,
		string(metadataJSON),
	); err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			if strings.Contains(err.Error(), "app_registry_display_name_idx") {
				return WrapRiverError(
					protocol.Err_ALREADY_EXISTS,
					err,
				).Message("another app with the same name already exists")
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
		nil,
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
		nil,
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
		nil,
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
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			appInfo, err = s.getAppInfo(ctx, app, tx)
			return err
		},
		nil,
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
	var displayName string
	if err := tx.QueryRow(
		ctx,
		`
		    SELECT app_id, app_owner_id, encrypted_shared_secret, forward_setting, app_metadata, display_name,
			    COALESCE(webhook, ''), COALESCE(device_key, ''), COALESCE(fallback_key, '')
		    FROM app_registry WHERE app_id = $1
		`,
		app,
	).Scan(
		&app,
		&owner,
		&encryptedSecret,
		&appInfo.Settings.ForwardSetting,
		&metadataJSON,
		&displayName,
		&appInfo.WebhookUrl,
		&appInfo.EncryptionDevice.DeviceKey,
		&appInfo.EncryptionDevice.FallbackKey,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "app is not registered")
		} else {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("failed to find app in registry")
		}
	} else {
		appInfo.App = common.BytesToAddress(app[:])
		appInfo.Owner = common.BytesToAddress(owner[:])
		appInfo.EncryptedSecret = encryptedSecret

		// Parse metadata JSON And apply the name field from the display name column.
		// The metadata JSON will not have a Name field defined, as it is omitted from
		// the json serialization of the object.
		if err := json.Unmarshal([]byte(metadataJSON), &appInfo.Metadata); err != nil {
			return nil, AsRiverError(err, protocol.Err_INTERNAL).
				Message("Unable to unmarshal app metadata from JSON")
		}
		appInfo.Metadata.Name = displayName
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
			).Message("app with device key is not registered")
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

func (s *PostgresAppRegistryStore) GetSendableApps(
	ctx context.Context,
	apps []common.Address,
) (sendableDevices []SendableApp, err error) {
	err = s.txRunner(
		ctx,
		"GetSendableApps",
		pgx.ReadOnly,
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
			WHERE app_id = ANY($1)
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
		    WHERE app_id = ANY($1)
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
		return nil, nil, RiverError(protocol.Err_NOT_FOUND, "some app ids were not registered")
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
		nil,
		"appAddress", app,
		"metadata", metadata,
	)
}

func (s *PostgresAppRegistryStore) setAppMetadata(
	ctx context.Context,
	app common.Address,
	metadata types.AppMetadata,
	txn pgx.Tx,
) error {
	// Marshal metadata to JSON (Name field is omitted via json:"-" tag)
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return AsRiverError(err, protocol.Err_INTERNAL).
			Message("Unable to marshal app metadata to JSON").Tag("metadata", metadata).Tag("name", metadata.Name)
	}

	tag, err := txn.Exec(
		ctx,
		`UPDATE app_registry SET app_metadata = $2, display_name = $3 WHERE app_id = $1`,
		PGAddress(app),
		string(metadataJSON),
		// We store the name in a separate column so we can guarantee unique bot diplay names.
		// The Name field is omitted from the serialized JSON, so there is no duplication here.
		metadata.Name,
	)
	if err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			return WrapRiverError(
				protocol.Err_ALREADY_EXISTS,
				err,
			).Message("another app with the same name already exists")
		} else {
			return RiverErrorWithBase(protocol.Err_DB_OPERATION_FAILURE, "unable to update the app metadata", err)
		}
	}
	if tag.RowsAffected() < 1 {
		return RiverError(protocol.Err_NOT_FOUND, "app was not found in registry")
	}

	return nil
}

func (s *PostgresAppRegistryStore) GetAppMetadata(
	ctx context.Context,
	app common.Address,
) (*types.AppMetadata, error) {
	var metadata *types.AppMetadata
	err := s.txRunner(
		ctx,
		"GetAppMetadata",
		pgx.ReadOnly,
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
	var displayName string
	if err := tx.QueryRow(
		ctx,
		`SELECT app_metadata, display_name FROM app_registry WHERE app_id = $1`,
		PGAddress(app),
	).Scan(&metadataJSON, &displayName); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "app is not registered")
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
	// Set the Name field from the display_name column.
	metadata.Name = displayName

	return &metadata, nil
}

func (s *PostgresAppRegistryStore) IsDisplayNameAvailable(
	ctx context.Context,
	displayName string,
) (bool, error) {
	var exists bool
	err := s.txRunner(
		ctx,
		"IsDisplayNameAvailable",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(
				ctx,
				"SELECT EXISTS(SELECT 1 FROM app_registry WHERE display_name = $1)",
				displayName,
			).Scan(&exists)
		},
		nil,
		"displayName", displayName,
	)
	if err != nil {
		return false, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to check display name availability")
	}
	return !exists, nil
}
