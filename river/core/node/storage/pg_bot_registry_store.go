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
	PostgresBotRegistryStore struct {
		PostgresEventStore

		exitSignal chan error
	}

	BotInfo struct {
		Bot        common.Address
		Owner      common.Address
		WebhookUrl string
	}

	BotRegistryStore interface {
		CreateBot(
			ctx context.Context,
			owner common.Address,
			bot common.Address,
			webhookUrl string,
		) error
		GetBotInfo(
			ctx context.Context,
			bot common.Address,
		) (*BotInfo, error)
	}
)

// PGAddress is a type alias for addresses that automatically serializes and deserializes
// addresses into and out of pg fixed-length character sequences.
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

var _ BotRegistryStore = (*PostgresBotRegistryStore)(nil)

//go:embed bot_registry_migrations/*.sql
var botRegistryDir embed.FS

func DbSchemaNameForBotRegistryService(botServiceId string) string {
	return fmt.Sprintf("bot_%s", hex.EncodeToString([]byte(botServiceId)))
}

// NewPostgresBotRegistryStore instantiates a new PostgreSQL persistent storage for the bot registry service.
func NewPostgresBotRegistryStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) (*PostgresBotRegistryStore, error) {
	store := &PostgresBotRegistryStore{
		exitSignal: exitSignal,
	}

	if err := store.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		nil,
		&botRegistryDir,
		"bot_registry_migrations",
	); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresBotRegistryStore")
	}

	if err := store.initStorage(ctx); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresBotRegistryStore")
	}

	return store, nil
}

func (s *PostgresBotRegistryStore) CreateBot(
	ctx context.Context,
	owner common.Address,
	bot common.Address,
	webhookUrl string,
) error {
	return s.txRunner(
		ctx,
		"CreateBot",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createBot(ctx, owner, bot, webhookUrl, tx)
		},
		nil,
		"botAddress", bot,
		"ownerAddress", owner,
		"webhookUrl", webhookUrl,
	)
}

func (s *PostgresBotRegistryStore) createBot(
	ctx context.Context,
	owner common.Address,
	bot common.Address,
	webhook string,
	txn pgx.Tx,
) error {
	if _, err := txn.Exec(
		ctx,
		"insert into bot_registry (bot_id, bot_owner_id, webhook) values ($1, $2, $3);",
		PGAddress(bot),
		PGAddress(owner),
		webhook,
	); err != nil {
		if isPgError(err, pgerrcode.UniqueViolation) {
			return WrapRiverError(protocol.Err_ALREADY_EXISTS, err).Message("Bot already exists")
		} else {
			return WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).Message("Unable to create bot record")
		}
	}
	return nil
}

func (s *PostgresBotRegistryStore) GetBotInfo(
	ctx context.Context,
	bot common.Address,
) (
	botInfo *BotInfo,
	err error,
) {
	err = s.txRunner(
		ctx,
		"GetBotInfo",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			botInfo, err = s.getBotInfo(ctx, tx, bot)
			return err
		},
		nil,
		"botAddress", bot,
	)
	if err != nil {
		return nil, err
	}
	return botInfo, nil
}

func (s *PostgresBotRegistryStore) getBotInfo(
	ctx context.Context,
	tx pgx.Tx,
	botAddr common.Address,
) (
	*BotInfo,
	error,
) {
	var owner, bot PGAddress
	bot = PGAddress(botAddr)
	var botInfo BotInfo
	if err := tx.QueryRow(ctx, "select bot_id, bot_owner_id, webhook from bot_registry where bot_id = $1", bot).
		Scan(&bot, &owner, &botInfo.WebhookUrl); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(protocol.Err_NOT_FOUND, "Bot does not exist")
		} else {
			return nil, WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("failed to find bot in registry")
		}
	} else {
		botInfo.Bot = common.BytesToAddress(bot[:])
		botInfo.Owner = common.BytesToAddress(owner[:])
	}
	return &botInfo, nil
}

// Close removes instance record from singlenodekey table, releases the listener
// connection, and closes the postgres connection pool
func (s *PostgresBotRegistryStore) Close(ctx context.Context) {
	s.PostgresEventStore.Close(ctx)
}
