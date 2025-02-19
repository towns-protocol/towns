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

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
)

type (
	PostgresAppRegistryStore struct {
		PostgresEventStore

		exitSignal chan error
	}

	AppInfo struct {
		App             common.Address
		Owner           common.Address
		EncryptedSecret [32]byte
		WebhookUrl      string
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
		) error

		GetAppInfo(
			ctx context.Context,
			app common.Address,
		) (*AppInfo, error)
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
			return WrapRiverError(protocol.Err_ALREADY_EXISTS, err).Message("App already exists")
		} else {
			return WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).Message("Unable to create app record")
		}
	}
	return nil
}

func (s *PostgresAppRegistryStore) RegisterWebhook(
	ctx context.Context,
	app common.Address,
	webhook string,
) error {
	return s.txRunner(
		ctx,
		"RegisterWebhook",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.registerWebhook(ctx, app, webhook, tx)
		},
		nil,
		"appAddress", app,
		"webhook", webhook,
	)
}

func (s *PostgresAppRegistryStore) registerWebhook(
	ctx context.Context,
	app common.Address,
	webhook string,
	txn pgx.Tx,
) error {
	tag, err := txn.Exec(
		ctx,
		`UPDATE app_registry SET webhook = $2 WHERE app_id = $1`,
		PGAddress(app),
		webhook,
	)
	if err != nil {
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
			appInfo, err = s.getAppInfo(ctx, tx, app)
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
	tx pgx.Tx,
	appAddr common.Address,
) (
	*AppInfo,
	error,
) {
	var owner, app PGAddress
	var encryptedSecret PGSecret
	app = PGAddress(appAddr)
	var appInfo AppInfo
	if err := tx.QueryRow(ctx, "select app_id, app_owner_id, encrypted_shared_secret, COALESCE(webhook, '') from app_registry where app_id = $1", app).
		Scan(&app, &owner, &encryptedSecret, &appInfo.WebhookUrl); err != nil {
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

// Close closes the postgres connection pool
func (s *PostgresAppRegistryStore) Close(ctx context.Context) {
	s.PostgresEventStore.Close(ctx)
}
