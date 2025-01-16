package storage

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"strings"
	"time"

	"github.com/exaring/otelpgx"
	"github.com/golang-migrate/migrate/v4"
	pgxmigrate "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"

	"github.com/river-build/river/core/config"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
)

type PostgresEventStore struct {
	config     *config.DatabaseConfig
	schemaName string
	dbUrl      string

	pool                *pgxpool.Pool
	poolConfig          *pgxpool.Config
	streamingPool       *pgxpool.Pool
	streamingPoolConfig *pgxpool.Config

	preMigrationTx func(context.Context, pgx.Tx) error
	migrationDir   fs.FS
	migrationPath  string

	txCounter  *infra.StatusCounterVec
	txDuration *prometheus.HistogramVec

	isolationLevel pgx.TxIsoLevel

	txTracker pgTxTracker
}

// var _ StreamStorage = (*PostgresEventStore)(nil)

const (
	PG_REPORT_INTERVAL = 3 * time.Minute
)

type txRunnerOpts struct {
	skipLoggingNotFound bool
	useStreamingPool    bool
}

func rollbackTx(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}

func (s *PostgresEventStore) txRunnerInner(
	ctx context.Context,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
) error {
	pool := s.pool
	if opts != nil && opts.useStreamingPool {
		pool = s.streamingPool
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: s.isolationLevel, AccessMode: accessMode})
	if err != nil {
		return err
	}
	defer rollbackTx(ctx, tx)

	err = txFn(ctx, tx)
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return err
	}
	return nil
}

type backoffTracker struct {
	last time.Duration
}

// Retries first attempt immediately, next waits for 50ms, then multipled by 1.5 each time.
func (b *backoffTracker) wait(ctx context.Context) error {
	if b.last == 0 {
		b.last = 50 * time.Millisecond
		return nil
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(b.last):
		b.last = b.last * 3 / 2
		return nil
	}
}

func (s *PostgresEventStore) txRunner(
	ctx context.Context,
	name string,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
	tags ...any,
) error {
	log := dlog.FromCtx(ctx).With(append(tags, "name", name, "dbSchema", s.schemaName)...)

	if accessMode == pgx.ReadWrite {
		// For write transactions context should not be cancelled if a client connection drops. Cancellations due to lost client connections can cause
		// operations on the PostgresEventStore to fail even if transactions commit, leading to a corruption in cached state.
		ctx = context.WithoutCancel(ctx)
	}

	defer prometheus.NewTimer(s.txDuration.WithLabelValues(name)).ObserveDuration()

	var backoff backoffTracker
	s.txTracker.track("START", name, tags...)
	for {
		err := s.txRunnerInner(ctx, accessMode, txFn, opts)
		if err != nil {
			pass := false

			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == pgerrcode.SerializationFailure || pgErr.Code == pgerrcode.DeadlockDetected {
					s.txTracker.track("RETRY", name, tags...)
					log.Debug(
						"pg.txRunner: retrying transaction due to serialization failure",
						"pgErr", pgErr,
						"txTracker", s.txTracker.dump(),
					)

					backoffErr := backoff.wait(ctx)
					if backoffErr != nil {
						s.txTracker.track("RETRY_TIMEOUT", name, tags...)
						return AsRiverError(backoffErr).Func(name).Message("Timed out waiting for backoff")
					}
					s.txCounter.WithLabelValues(name, "retry").Inc()
					continue
				}
				log.Warn("pg.txRunner: transaction failed", "pgErr", pgErr)
			} else {
				level := slog.LevelWarn
				if opts != nil && opts.skipLoggingNotFound && AsRiverError(err).Code == Err_NOT_FOUND {
					// Count "not found" as succeess if error is potentially expected
					pass = true
					level = slog.LevelDebug
				}
				log.Log(ctx, level, "pg.txRunner: transaction failed", "err", err)
			}

			if pass {
				s.txCounter.IncPass(name)
			} else {
				s.txCounter.IncFail(name)
			}

			s.txTracker.track("ERROR", name, tags...)
			return WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Func("pg.txRunner").
				Message("transaction failed").
				Tag("name", name).
				Tags(tags...)
		}

		log.Debug("pg.txRunner: transaction succeeded")
		s.txCounter.IncPass(name)
		s.txTracker.track("DONE", name, tags...)
		return nil
	}
}

type PgxPoolInfo struct {
	Pool              *pgxpool.Pool
	PoolConfig        *pgxpool.Config
	StreamingPool     *pgxpool.Pool
	StreamingPoolConf *pgxpool.Config
	Url               string
	Schema            string
	Config            *config.DatabaseConfig
}

func createPgxPool(
	ctx context.Context,
	databaseUrl string,
	databaseSchemaName string,
	tracerProvider trace.TracerProvider,
	name string,
) (*pgxpool.Pool, *pgxpool.Config, error) {
	poolConf, err := pgxpool.ParseConfig(databaseUrl)
	if err != nil {
		return nil, nil, err
	}

	// In general, it should be possible to add database schema name into database url as a parameter search_path (&search_path=database_schema_name)
	// For some reason it doesn't work so have to put it into config explicitly
	poolConf.ConnConfig.RuntimeParams["search_path"] = databaseSchemaName
	poolConf.ConnConfig.RuntimeParams["application_name"] = name

	poolConf.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	if tracerProvider != nil {
		poolConf.ConnConfig.Tracer = otelpgx.NewTracer(
			otelpgx.WithTracerProvider(tracerProvider),
			otelpgx.WithDisableQuerySpanNamePrefix(),
			otelpgx.WithTrimSQLInSpanName(),
		)
	}

	pool, err := pgxpool.NewWithConfig(ctx, poolConf)
	if err != nil {
		return nil, nil, err
	}

	if err = pool.Ping(ctx); err != nil {
		return nil, nil, err
	}

	return pool, poolConf, nil
}

func createAndValidatePgxPool(
	ctx context.Context,
	cfg *config.DatabaseConfig,
	databaseSchemaName string,
	tracerProvider trace.TracerProvider,
) (*PgxPoolInfo, error) {
	databaseUrl := cfg.GetUrl()

	// This connection pool is used for any queries apart from large number of rows selection
	pool, poolConf, err := createPgxPool(ctx, databaseUrl, databaseSchemaName, tracerProvider, "regular")
	if err != nil {
		return nil, err
	}

	// This connection pool is used to select large number of rows and stream them directly into a client
	streamingPool, streamingPoolConf, err := createPgxPool(
		ctx,
		databaseUrl,
		databaseSchemaName,
		tracerProvider,
		"streaming",
	)
	if err != nil {
		return nil, err
	}

	return &PgxPoolInfo{
		Pool:              pool,
		PoolConfig:        poolConf,
		StreamingPool:     streamingPool,
		StreamingPoolConf: streamingPoolConf,
		Url:               databaseUrl,
		Schema:            databaseSchemaName,
		Config:            cfg,
	}, nil
}

func CreateAndValidatePgxPool(
	ctx context.Context,
	cfg *config.DatabaseConfig,
	databaseSchemaName string,
	tracerProvider trace.TracerProvider,
) (*PgxPoolInfo, error) {
	r, err := createAndValidatePgxPool(ctx, cfg, databaseSchemaName, tracerProvider)
	if err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Func("CreateAndValidatePgxPool")
	}
	return r, nil
}

func (s *PostgresEventStore) init(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	metrics infra.MetricsFactory,
	preMigrationTxn func(context.Context, pgx.Tx) error,
	migrations fs.FS,
	migrationsPath string,
) error {
	log := dlog.FromCtx(ctx)

	setupPostgresMetrics(ctx, *poolInfo, metrics)

	s.config = poolInfo.Config
	s.pool = poolInfo.Pool
	s.poolConfig = poolInfo.PoolConfig
	s.streamingPool = poolInfo.StreamingPool
	s.streamingPoolConfig = poolInfo.StreamingPoolConf
	s.schemaName = poolInfo.Schema
	s.dbUrl = poolInfo.Url

	s.preMigrationTx = preMigrationTxn
	s.migrationDir = migrations
	s.migrationPath = migrationsPath

	s.txCounter = metrics.NewStatusCounterVecEx("dbtx_status", "PG transaction status", "name")
	s.txDuration = metrics.NewHistogramVecEx(
		"dbtx_duration_seconds",
		"PG transaction duration",
		infra.DefaultDbTxDurationBucketsSeconds,
		"name",
	)

	switch strings.ToLower(poolInfo.Config.IsolationLevel) {
	case "serializable":
		s.isolationLevel = pgx.Serializable
	case "repeatable read", "repeatable_read", "repeatableread":
		s.isolationLevel = pgx.RepeatableRead
	case "read committed", "read_committed", "readcommitted":
		s.isolationLevel = pgx.ReadCommitted
	default:
		s.isolationLevel = pgx.Serializable
	}

	if s.isolationLevel != pgx.Serializable {
		log.Info("PostgresEventStore: using isolation level", "level", s.isolationLevel)
	}

	if s.config.DebugTransactions {
		s.txTracker.enable()
	}

	err := s.InitStorage(ctx)
	if err != nil {
		return err
	}

	return nil
}

// Close closes the connection pool
func (s *PostgresEventStore) Close(ctx context.Context) {
	s.pool.Close()
	s.streamingPool.Close()
}

func (s *PostgresEventStore) InitStorage(ctx context.Context) error {
	err := s.initStorage(ctx)
	if err != nil {
		return AsRiverError(err).Func("InitStorage").Tag("schemaName", s.schemaName)
	}

	return nil
}

func (s *PostgresEventStore) createSchemaTx(ctx context.Context, tx pgx.Tx) error {
	log := dlog.FromCtx(ctx)

	// Create schema iff not exists
	var schemaExists bool
	err := tx.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
		s.schemaName).Scan(&schemaExists)
	if err != nil {
		return err
	}

	if !schemaExists {
		createSchemaQuery := fmt.Sprintf("CREATE SCHEMA \"%s\"", s.schemaName)
		_, err := tx.Exec(ctx, createSchemaQuery)
		if err != nil {
			return err
		}
		log.Info("DB Schema created", "schema", s.schemaName)
	} else {
		if config.UseDetailedLog(ctx) {
			log.Info("DB Schema already exists", "schema", s.schemaName)
		}
	}
	return nil
}

func (s *PostgresEventStore) runMigrations(ctx context.Context) error {
	// Run migrations
	iofsMigrationsDir, err := iofs.New(s.migrationDir, s.migrationPath)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error loading migrations")
	}

	// Create a new connection pool with the same configuration for migrations.
	// Note: pgxmigrate.WithInstance takes ownership of the provided pool.
	pool, err := pgxpool.NewWithConfig(ctx, s.poolConfig)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Failed to create pool for migrations")
	}
	defer pool.Close()

	pgxDriver, err := pgxmigrate.WithInstance(
		stdlib.OpenDBFromPool(pool),
		&pgxmigrate.Config{
			SchemaName: s.schemaName,
		})
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Failed to initialize pgx driver for migration")
	}

	migration, err := migrate.NewWithInstance("iofs", iofsMigrationsDir, "pgx", pgxDriver)
	defer func() {
		_, _ = migration.Close()
	}()

	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error creating migration instance")
	}

	if err = migration.Up(); err != nil && err != migrate.ErrNoChange {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error running migrations")
	}

	return nil
}

func (s *PostgresEventStore) initStorage(ctx context.Context) error {
	err := s.txRunner(
		ctx,
		"createSchema",
		pgx.ReadWrite,
		s.createSchemaTx,
		&txRunnerOpts{},
	)
	if err != nil {
		return err
	}

	// Optionally run a transaction before the migrations are applied
	if s.preMigrationTx != nil {
		log := dlog.FromCtx(ctx)
		log.Info("Running pre-migration transaction")
		if err := s.txRunner(
			ctx,
			"preMigrationTx",
			pgx.ReadWrite,
			s.preMigrationTx,
			&txRunnerOpts{},
		); err != nil {
			return err
		}
	}

	err = s.runMigrations(ctx)
	if err != nil {
		return err
	}

	return nil
}
