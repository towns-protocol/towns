package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	mapset "github.com/deckarep/golang-set/v2"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
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

	// When this is returned, caller already has access to the device key,
	// session key, and ciphertext. They can combine these with the returned
	// information here to form the following tuple needed for sending each message
	// (webhookUrl, ciphertext, encryptedSharedSecret, streamEvent)
	// where:
	// - webhookUrl is the address of the bot service
	// - ciphertext is the session key encrypted with the fallback public key of the
	//   bot's device key, decryptable only by the bot, who has access to the private
	//   key of the fallback key pair
	// - encryptedSharedSecret is the shared hmac secret used by the app registry server
	//   to sign jwt tokens for authentication of origination of webhook calls, and
	// - StreamEvents is an array of serialized channel message payload stream events
	SendableMessages struct {
		AppId                 common.Address // included here for logging / metrics
		EncryptedSharedSecret [32]byte
		WebhookUrl            string
		StreamEvents          [][]byte
	}

	// When SendableDevice is returned, the caller has access to the session id and
	// stream event binary already. Return
	// (appId, deviceKey, encryptedSharedSecret, ciphertext)
	SendableDevice struct {
		AppId              common.Address
		DeviceKey          string
		SendMessageSecrets SendMessageSecrets
	}

	SendMessageSecrets struct {
		CipherText            string
		EncryptedSharedSecret [32]byte
	}

	// map[deviceId]SendMessageSecrets
	DeviceSecrets map[string]SendMessageSecrets

	AppInfo struct {
		App              common.Address
		Owner            common.Address
		EncryptedSecret  [32]byte
		WebhookUrl       string
		EncryptionDevice EncryptionDevice
	}

	AppRegistryStore interface {
		CreateApp(
			ctx context.Context,
			owner common.Address,
			app common.Address,
			sharedSecret [32]byte,
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

		// PublishSessionKey creates a key for a (device_key, session_id) pair and returns all enqueued messages
		// that become sendable now that this session key is available. If no keys become sendable, messages
		// is nil.
		PublishSessionKey(
			ctx context.Context,
			deviceKey string,
			sessionId string,
			ciphertext string,
		) (messages *SendableMessages, err error)

		// EnqueueUnsendableMessages enqueues the message to be sent for all devices that do not yet
		// have a session key stored for this session. It returns the set of all devices
		// that can be sent to because they do have the session key, along with the session
		// key and encrypted shared secret for jwt token generation.
		EnqueueUnsendableMessages(
			ctx context.Context,
			deviceKeys []string,
			sessionId string,
			streamEventBytes []byte,
		) (sendableDevices []SendableDevice, numEnqueued int, err error)

		// IsRegistered can be called by any client to determine if an app with the given
		// deviceKey is registered. At this time we only allow 1 device key per app and all
		// device keys must be unique, so there is a 1 to 1 correspondence between device
		// keys and app ids.
		IsRegistered(
			ctx context.Context,
			deviceKey string,
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
// This implementation requires isolation level of at least repeatable read in order for the queueing
// functionality to work as expected.
func NewPostgresAppRegistryStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) (*PostgresAppRegistryStore, error) {
	store := &PostgresAppRegistryStore{
		exitSignal: exitSignal,
	}

	if err := store.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		nil,
		&AppRegistryDir,
		"app_registry_migrations",
	); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresAppRegistryStore")
	}

	if err := store.initStorage(ctx); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresAppRegistryStore")
	}

	return store, nil
}

func (s *PostgresAppRegistryStore) CreateApp(
	ctx context.Context,
	owner common.Address,
	app common.Address,
	encryptedSharedSecret [32]byte,
) error {
	return s.txRunner(
		ctx,
		"CreateApp",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createApp(ctx, owner, app, encryptedSharedSecret, tx)
		},
		nil,
		"appAddress", app,
		"ownerAddress", owner,
	)
}

func (s *PostgresAppRegistryStore) createApp(
	ctx context.Context,
	owner common.Address,
	app common.Address,
	encryptedSharedSecret [32]byte,
	txn pgx.Tx,
) error {
	if _, err := txn.Exec(
		ctx,
		"insert into app_registry (app_id, app_owner_id, encrypted_shared_secret) values ($1, $2, $3);",
		PGAddress(app),
		PGAddress(owner),
		PGSecret(encryptedSharedSecret),
	); err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			return WrapRiverError(protocol.Err_ALREADY_EXISTS, err).Message("app already exists")
		} else {
			return WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).Message("unable to create app record")
		}
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
	if err := tx.QueryRow(
		ctx,
		`
		    SELECT app_id, app_owner_id, encrypted_shared_secret, COALESCE(webhook, ''),
		        COALESCE(device_key, ''), COALESCE(fallback_key, '')
		    FROM app_registry WHERE app_id = $1
		`,
		app,
	).Scan(
		&app,
		&owner,
		&encryptedSecret,
		&appInfo.WebhookUrl,
		&appInfo.EncryptionDevice.DeviceKey,
		&appInfo.EncryptionDevice.FallbackKey,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "app does not exist")
		} else {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("failed to find app in registry")
		}
	} else {
		appInfo.App = common.BytesToAddress(app[:])
		appInfo.Owner = common.BytesToAddress(owner[:])
		appInfo.EncryptedSecret = encryptedSecret
	}
	return &appInfo, nil
}

func (s *PostgresAppRegistryStore) PublishSessionKey(
	ctx context.Context,
	deviceKey string,
	sessionId string,
	ciphertext string,
) (messages *SendableMessages, err error) {
	err = s.txRunner(
		ctx,
		"PublishSessionKey",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			messages, err = s.publishSessionKey(ctx, deviceKey, sessionId, ciphertext, tx)
			return err
		},
		nil,
		"deviceKey", deviceKey,
		"sessionId", sessionId,
	)
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (s *PostgresAppRegistryStore) publishSessionKey(
	ctx context.Context,
	deviceKey string,
	sessionId string,
	ciphertext string,
	tx pgx.Tx,
) (messages *SendableMessages, err error) {
	_, err = tx.Exec(
		ctx,
		`   INSERT INTO app_session_keys (device_key, session_id, ciphertext)
			VALUES ($1, $2, $3);	
		`,
		deviceKey,
		sessionId,
		ciphertext,
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
			AND session_id = $2
			RETURNING message_envelope;
		`,
		deviceKey,
		sessionId,
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
			messages.StreamEvents = append(messages.StreamEvents, message)
			return nil
		},
	); err != nil {
		return nil, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to scan from sendable messages")
	}
	if len(messages.StreamEvents) == 0 {
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

func (s *PostgresAppRegistryStore) EnqueueUnsendableMessages(
	ctx context.Context,
	deviceKeys []string,
	sessionId string,
	streamEventBytes []byte,
) (sendableDevices []SendableDevice, enqueued int, err error) {
	if err = s.txRunner(
		ctx,
		"EnqueueUnsendableMessages",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			sendableDevices, enqueued, err = s.enqueueUnsendableMessages(ctx, deviceKeys, sessionId, streamEventBytes, tx)
			return err
		},
		nil,
		"deviceKeys", deviceKeys,
		"sessionId", sessionId,
	); err != nil {
		return nil, 0, err
	}
	return sendableDevices, enqueued, nil
}

func (s *PostgresAppRegistryStore) enqueueUnsendableMessages(
	ctx context.Context,
	deviceKeys []string,
	sessionId string,
	streamEventBytes []byte,
	tx pgx.Tx,
) (sendableDevices []SendableDevice, enqueued int, err error) {
	rows, err := tx.Query(
		ctx,
		`   SELECT app_id, device_keys.device_key, encrypted_shared_secret, ciphertext
		    FROM (
		        SELECT *
		        FROM app_session_keys
		        WHERE app_session_keys.session_id = $1
		        AND app_session_keys.device_key = ANY($2)
		    ) as device_keys
		    INNER JOIN app_registry
			ON device_keys.device_key = app_registry.device_key
		`,
		sessionId,
		deviceKeys,
	)
	if err != nil {
		return nil, 0, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to get existing session keys for devices")
	}
	sendableDevices = make([]SendableDevice, 0)
	sendableDeviceIds := mapset.NewSet[string]()

	var sendableDevice SendableDevice
	var appId PGAddress
	var encryptedSharedSecret PGSecret
	if _, err := pgx.ForEachRow(
		rows,
		[]any{&appId, &sendableDevice.DeviceKey, &encryptedSharedSecret, &sendableDevice.SendMessageSecrets.CipherText},
		func() error {
			sendableDevice.AppId = common.Address(appId)
			sendableDevice.SendMessageSecrets.EncryptedSharedSecret = encryptedSharedSecret
			sendableDevices = append(sendableDevices, sendableDevice)
			sendableDeviceIds.Add(sendableDevice.DeviceKey)
			return nil
		},
	); err != nil {
		return nil, 0, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to get existing keys for devices")
	}

	unsendableDevices := make([]string, 0, len(deviceKeys)-len(sendableDevices))
	for _, deviceKey := range deviceKeys {
		if !sendableDeviceIds.Contains(deviceKey) {
			unsendableDevices = append(unsendableDevices, deviceKey)
		}
	}

	nextRow := 0
	insertCount, err := tx.CopyFrom(
		ctx,
		pgx.Identifier{"enqueued_messages"},
		[]string{"device_key", "session_id", "message_envelope"},
		pgx.CopyFromFunc(func() ([]interface{}, error) {
			if nextRow >= len(unsendableDevices) {
				return nil, nil
			}

			row := []interface{}{unsendableDevices[nextRow], sessionId, streamEventBytes}
			nextRow++
			return row, nil
		}),
	)
	if err != nil {
		if isPgError(err, pgerrcode.ForeignKeyViolation) {
			return nil, 0, WrapRiverError(protocol.Err_NOT_FOUND, err).Message(
				"unable to enqueue messages for session - app with device key is not registered",
			).Tag("deviceKey", unsendableDevices[nextRow-1])
		} else {
			return nil, 0, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).Message(
				"unable to enqueue messages for session",
			)
		}
	}
	if insertCount < int64(len(unsendableDevices)) {
		return nil, 0, RiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			"Could not enqueue all unsendable messages for session",
		)
	}
	return sendableDevices, len(unsendableDevices), nil
}

func (s *PostgresAppRegistryStore) IsRegistered(
	ctx context.Context,
	deviceKey string,
) (isRegistered bool, err error) {
	if err = s.txRunner(
		ctx,
		"IsRegistered",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			isRegistered, err = s.isRegistered(ctx, deviceKey, tx)
			return err
		},
		nil,
		"deviceKey", deviceKey,
	); err != nil {
		return false, err
	}
	return isRegistered, nil
}

func (s *PostgresAppRegistryStore) isRegistered(
	ctx context.Context,
	deviceKey string,
	tx pgx.Tx,
) (isRegistered bool, err error) {
	if err = tx.QueryRow(
		ctx,
		`SELECT COUNT(*) > 0 FROM app_registry WHERE device_key = $1`,
		deviceKey,
	).Scan(&isRegistered); err != nil {
		return false, WrapRiverError(
			protocol.Err_DB_OPERATION_FAILURE,
			err,
		).Message("unable to determine if device id is registered")
	}
	return isRegistered, nil
}

// Close closes the postgres connection pool
func (s *PostgresAppRegistryStore) Close(ctx context.Context) {
	s.PostgresEventStore.Close(ctx)
}
