package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"slices"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gammazero/workerpool"
	"github.com/golang-migrate/migrate/v4"
	pgxmigrate "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

func wrapError(message string, err error) error {
	return fmt.Errorf("%s: %w", message, err)
}

func getPartitionName(table string, streamId string, numPartitions int) string {
	sharedStreamId, err := shared.StreamIdFromString(streamId)
	if err != nil {
		fmt.Println("Bad stream id: ", streamId)
		os.Exit(1)
	}
	suffix := storage.CreatePartitionSuffix(sharedStreamId, numPartitions)
	return fmt.Sprintf("%s_%s", table, suffix)
}

type dbInfo struct {
	url        string
	schema     string
	isArchiver bool
}

func getDbPool(
	ctx context.Context,
	db dbInfo,
	password string,
	requireSchema bool,
) (*pgxpool.Pool, error) {
	if db.url == "" {
		return nil, errors.New("database URL is not set")
	}
	if requireSchema && db.schema == "" {
		return nil, errors.New("schema is not set")
	}

	cfg, err := pgxpool.ParseConfig(db.url)
	if err != nil {
		return nil, err
	}

	if password != "" {
		cfg.ConnConfig.Password = password
	}

	if db.schema != "" {
		cfg.ConnConfig.RuntimeParams["search_path"] = db.schema
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return pool, nil
}

func getSourceDbPool(ctx context.Context, requireSchema bool) (*pgxpool.Pool, *dbInfo, error) {
	var info dbInfo
	info.url = viper.GetString("RIVER_DB_SOURCE_URL")
	if info.url == "" {
		return nil, nil, errors.New("source database URL is not set: --source_db or RIVER_DB_SOURCE_URL")
	}
	password := viper.GetString("RIVER_DB_SOURCE_PASSWORD")
	info.schema = viper.GetString("RIVER_DB_SCHEMA")

	pool, err := getDbPool(ctx, info, password, requireSchema)
	if err != nil {
		return nil, nil, wrapError("Failed to initialize source database pool", err)
	}

	return pool, &info, nil
}

func getTargetDbPool(ctx context.Context, requireSchema bool) (*pgxpool.Pool, *dbInfo, error) {
	var info dbInfo
	info.url = viper.GetString("RIVER_DB_TARGET_URL")
	if info.url == "" {
		return nil, nil, errors.New("target database URL is not set: --target_db or RIVER_DB_TARGET_URL")
	}
	password := viper.GetString("RIVER_DB_TARGET_PASSWORD")
	info.schema = viper.GetString("RIVER_DB_SCHEMA")
	schemaOverwrite := viper.GetString("RIVER_DB_SCHEMA_TARGET_OVERWRITE")
	if schemaOverwrite != "" {
		info.schema = schemaOverwrite
	}

	pool, err := getDbPool(ctx, info, password, requireSchema)
	if err != nil {
		return nil, nil, wrapError("Failed to initialize target database pool", err)
	}

	return pool, &info, nil
}

func getStreamCount(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	var streamCount int
	err := pool.QueryRow(ctx, "SELECT count(*) FROM es").Scan(&streamCount)
	if err != nil {
		return 0, wrapError("Failed to count streams in es table(wrong schema?)", err)
	}
	return streamCount, nil
}

func testDbConnection(ctx context.Context, pool *pgxpool.Pool, info *dbInfo) error {
	var version string
	err := pool.QueryRow(ctx, "SELECT version()").Scan(&version)
	if err != nil {
		return wrapError("Failed to get database version", err)
	}

	fmt.Println("Database version:", version)

	if info.schema != "" {
		streamCount, err := getStreamCount(ctx, pool)
		if err != nil {
			return err
		}
		fmt.Println("Stream count:", streamCount)
	}

	return nil
}

var (
	rootCmd = &cobra.Command{
		Use:          "river_migrate_db",
		SilenceUsage: true,
	}
	verbose bool
)

func init() {
	rootCmd.PersistentFlags().StringP("db_source", "s", "", "Source database URL")
	_ = viper.BindPFlag("RIVER_DB_SOURCE_URL", rootCmd.PersistentFlags().Lookup("db_source"))

	rootCmd.PersistentFlags().StringP("db_target", "t", "", "Target database URL")
	_ = viper.BindPFlag("RIVER_DB_TARGET_URL", rootCmd.PersistentFlags().Lookup("db_target"))

	viper.SetDefault("RIVER_DB_SOURCE_PASSWORD", "")
	viper.SetDefault("RIVER_DB_TARGET_PASSWORD", "")

	rootCmd.PersistentFlags().StringP("schema", "i", "", "Schema name (i.e. instance hex id prefixed with 's0x')")
	_ = viper.BindPFlag("RIVER_DB_SCHEMA", rootCmd.PersistentFlags().Lookup("schema"))

	rootCmd.PersistentFlags().StringP("schema_target_overwrite", "o", "", "Advanced: restore into different schema")
	_ = viper.BindPFlag("RIVER_DB_SCHEMA_TARGET_OVERWRITE", rootCmd.PersistentFlags().Lookup("schema_target_overwrite"))

	rootCmd.PersistentFlags().IntP("num_workers", "n", 4, "Number of parallel workers to use for target db operations")
	_ = viper.BindPFlag("RIVER_DB_NUM_WORKERS", rootCmd.PersistentFlags().Lookup("num_workers"))

	rootCmd.PersistentFlags().IntP("tx_size", "x", 10, "Number of streams to process in a single transaction")
	_ = viper.BindPFlag("RIVER_DB_TX_SIZE", rootCmd.PersistentFlags().Lookup("tx_size"))

	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "Print verbose logs")

	viper.SetDefault("RIVER_DB_PARTITION_TX_SIZE", 16)
	viper.SetDefault("RIVER_DB_PARTITION_WORKERS", 8)
	viper.SetDefault("RIVER_DB_ATTACH_WORKERS", 1)
}

var sourceCmd = &cobra.Command{
	Use:   "source",
	Short: "Validate source database settings",
}

func init() {
	rootCmd.AddCommand(sourceCmd)
}

var sourceTestCmd = &cobra.Command{
	Use:   "test",
	Short: "Test source database connection",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, info, err := getSourceDbPool(ctx, true)
		if err != nil {
			return err
		}

		fmt.Println("Testing source database connection")
		return testDbConnection(ctx, pool, info)
	},
}

func init() {
	sourceCmd.AddCommand(sourceTestCmd)
}

var (
	sourceListCmdCount                bool
	sourceListCommandMigrated         bool
	sourceListCommandFilterUnmigrated bool
	targetListCommandMigrated         bool
	sourceListCmd                     = &cobra.Command{
		Use:   "list",
		Short: "List source database schemas",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			pool, _, err := getSourceDbPool(ctx, false)
			if err != nil {
				return err
			}

			rows, err := pool.Query(ctx, "SELECT schema_name FROM information_schema.schemata")
			if err != nil {
				return err
			}
			defer rows.Close()

			for rows.Next() {
				var schema string
				err = rows.Scan(&schema)
				if err != nil {
					return err
				}
				if !sourceListCmdCount {
					fmt.Println(schema)
				} else {
					streamCount := -1
					_ = pool.QueryRow(ctx, fmt.Sprintf("SELECT count(*) FROM %s.es", schema)).Scan(&streamCount)
					fmt.Println(schema, streamCount)
				}
			}

			return nil
		},
	}
)

func init() {
	sourceListCmd.Flags().BoolVar(&sourceListCmdCount, "count", false, "Count streams for each schema")
	sourceCmd.AddCommand(sourceListCmd)
}

var (
	sourceListStreamsCmd = &cobra.Command{
		Use:   "list_streams",
		Short: "List source database streams",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			pool, _, err := getSourceDbPool(ctx, false)
			if err != nil {
				return err
			}

			streamIds, _, migrated, err := getStreamIds(ctx, pool)
			if err != nil {
				fmt.Println("Error reading stream ids:", err)
				os.Exit(1)
			}

			if sourceListCommandFilterUnmigrated && verbose {
				fmt.Println("Printing only unmigrated streams...")
				fmt.Println()
			}

			if sourceListCommandMigrated {
				fmt.Println("Stream Ids, migrated")
				fmt.Println("====================")

			} else {
				fmt.Println("Stream Ids")
				fmt.Println("==========")
			}

			for i, id := range streamIds {
				streamMigrated := migrated[i]
				if sourceListCommandFilterUnmigrated && streamMigrated {
					continue
				}

				if sourceListCommandMigrated {
					fmt.Println(id, streamMigrated)
				} else {
					fmt.Println(id)
				}
			}
			fmt.Println()

			return nil
		},
	}

	targetListStreamsCmd = &cobra.Command{
		Use:   "list_streams",
		Short: "List target database streams",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			pool, _, err := getTargetDbPool(ctx, false)
			if err != nil {
				return err
			}

			streamIds, _, migrated, err := getStreamIds(ctx, pool)
			if err != nil {
				fmt.Println("Error reading stream ids:", err)
				os.Exit(1)
			}

			if targetListCommandMigrated {
				fmt.Println("Stream Ids, migrated")
				fmt.Println("====================")

			} else {
				fmt.Println("Stream Ids")
				fmt.Println("==========")
			}
			for i, id := range streamIds {
				if targetListCommandMigrated {
					fmt.Println(id, migrated[i])
				} else {
					fmt.Println(id)
				}
			}
			fmt.Println()

			return nil
		},
	}
)

func init() {
	sourceListStreamsCmd.Flags().
		BoolVarP(&sourceListCommandMigrated, "migrated", "m", false, "Show stream migration status")
	sourceListStreamsCmd.Flags().
		BoolVarP(&sourceListCommandFilterUnmigrated, "filter_unmigrated", "f", false, "Show only unmigrated streams")
	sourceCmd.AddCommand(sourceListStreamsCmd)
	targetListStreamsCmd.Flags().
		BoolVarP(&targetListCommandMigrated, "migrated", "m", false, "Show stream migration status")
	targetCmd.AddCommand(targetListStreamsCmd)
}

var sourceListPCmd = &cobra.Command{
	Use:   "list_partitions",
	Short: "List source database partitions",
	RunE: func(cmd *cobra.Command, args []string) error {
		pool, _, err := getSourceDbPool(cmd.Context(), true)
		if err != nil {
			return err
		}

		return printPartitions(cmd.Context(), pool)
	},
}

func init() {
	sourceCmd.AddCommand(sourceListPCmd)
}

var targetCmd = &cobra.Command{
	Use:   "target",
	Short: "Init or validate target database",
}

func init() {
	rootCmd.AddCommand(targetCmd)
}

var targetTestCmd = &cobra.Command{
	Use:   "test",
	Short: "Test target database connection",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, info, err := getTargetDbPool(ctx, false)
		if err != nil {
			return err
		}

		fmt.Println("Testing target database connection")
		return testDbConnection(ctx, pool, info)
	},
}

func init() {
	targetCmd.AddCommand(targetTestCmd)
}

var targetCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create target database schema",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, info, err := getTargetDbPool(ctx, false)
		if err != nil {
			return err
		}

		_, err = pool.Exec(ctx, fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS \"%s\"", info.schema))
		return err
	},
}

func init() {
	targetCmd.AddCommand(targetCreateCmd)
}

var targetInitCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize target database",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()

		iofsMigrationsDir, err := iofs.New(storage.GetRiverNodeDbMigrationSchemaFS(), "migrations")
		if err != nil {
			fmt.Println("Failed to load migrations", err)
			os.Exit(1)
		}

		pool, info, err := getTargetDbPool(ctx, true)
		if err != nil {
			fmt.Println("Failed to initialize target database pool:", err)
			os.Exit(1)
		}

		pgxDriver, err := pgxmigrate.WithInstance(
			stdlib.OpenDBFromPool(pool),
			&pgxmigrate.Config{
				SchemaName: info.schema,
			})
		if err != nil {
			fmt.Println("Failed to initialize target database migration driver:", err)
			os.Exit(1)
		}

		migration, err := migrate.NewWithInstance("iofs", iofsMigrationsDir, "pgx", pgxDriver)
		if err != nil {
			fmt.Println("Failed to initialize target database migration:", err)
			os.Exit(1)
		}

		err = migration.Up()
		if err != nil {
			if err != migrate.ErrNoChange {
				fmt.Println("Error running go migrations:", err)
				os.Exit(1)
			} else {
				fmt.Println("WARN: schema already initialized")
			}
		}

		return nil
	},
}

func init() {
	targetCmd.AddCommand(targetInitCmd)
}

func escapedSql(sql string, streamId string, metadata schemaMetadata) string {
	suffix := getPartitionName("", streamId, metadata.numPartitions)

	sql = strings.ReplaceAll(
		sql,
		"{{miniblocks}}",
		"miniblocks"+suffix,
	)
	sql = strings.ReplaceAll(
		sql,
		"{{minipools}}",
		"minipools"+suffix,
	)
	sql = strings.ReplaceAll(
		sql,
		"{{miniblock_candidates}}",
		"miniblock_candidates"+suffix,
	)

	return sql
}

func inspectStream(ctx context.Context, pool *pgxpool.Pool, streamId string) error {
	var migrated bool
	var latestSnapshotMiniblock int

	err := pool.QueryRow(
		ctx,
		"SELECT latest_snapshot_miniblock, migrated from es where stream_id = $1",
		streamId,
	).Scan(&latestSnapshotMiniblock, &migrated)
	if err != nil {
		fmt.Println("Error reading stream from es table:", err)
		os.Exit(1)
	}

	metadata := schemaMetadata{
		migrated: migrated,
	}
	if migrated {
		numPartitions, err := getNumPartitionSettings(ctx, pool)
		if err != nil {
			fmt.Println("Error reading schema numPartitions setting:", err)
			os.Exit(1)
		}
		metadata.numPartitions = numPartitions
	}

	rows, err := pool.Query(
		ctx,
		escapedSql(
			`SELECT stream_id, seq_num, blockdata from {{miniblocks}}
			WHERE stream_id = $1 order by seq_num `,
			streamId,
			metadata,
		),
		streamId,
	)
	if err != nil {
		fmt.Println("Error reading stream miniblocks:", err)
		os.Exit(1)
	}

	fmt.Println("Miniblocks (stream_id, seq_num, blockdata)")
	fmt.Println("==========================================")
	for rows.Next() {
		var id string
		var seqNum int64
		var blockData []byte
		if err := rows.Scan(&id, &seqNum, &blockData); err != nil {
			fmt.Println("Error scanning miniblock row:", err)
			os.Exit(1)
		}
		fmt.Printf("%v %v %v\n", id, seqNum, hex.EncodeToString(blockData))
	}
	fmt.Println()

	rows, err = pool.Query(
		ctx,
		escapedSql(
			`SELECT stream_id, seq_num, block_hash, blockdata from {{miniblock_candidates}}
			WHERE stream_id = $1 order by seq_num, block_hash`,
			streamId,
			metadata,
		),
		streamId,
	)
	if err != nil {
		fmt.Println("Error reading stream miniblock candidates :", err)
		fmt.Println("Some streams may have been allocated before the miniblock_candidate table was created")
	} else {
		fmt.Println("Miniblock Candidates (stream_id, seq_num, block_hash, block_data)")
		fmt.Println("==================================================================")
		for rows.Next() {
			var id string
			var seqNum int64
			var hashStr string
			var blockData []byte
			if err := rows.Scan(&id, &seqNum, &hashStr, &blockData); err != nil {
				fmt.Println("Error scanning miniblock candidate row:", err)
				os.Exit(1)
			}
			fmt.Printf("%v %v %v %v\n", id, seqNum, hashStr, hex.EncodeToString(blockData))
		}
		fmt.Println()
	}

	rows, err = pool.Query(
		ctx,
		escapedSql(
			`SELECT stream_id, generation, slot_num, envelope from {{minipools}}
			WHERE stream_id = $1 order by generation, slot_num`,
			streamId,
			metadata,
		),
		streamId,
	)
	if err != nil {
		fmt.Println("Error reading stream minipools:", err)
		os.Exit(1)
	}

	fmt.Println("Minipools (stream_id, generation, slot_num, envelope)")
	fmt.Println("=====================================================")
	for rows.Next() {
		var id string
		var generation int64
		var slotNum int64
		var envelope []byte
		if err := rows.Scan(&id, &generation, &slotNum, &envelope); err != nil {
			fmt.Println("Error scanning miniblock row:", err)
			os.Exit(1)
		}
		fmt.Printf("%v %v %v %v\n", id, generation, slotNum, hex.EncodeToString(envelope))
	}
	fmt.Println()

	return nil
}

var srcInspectCmd = &cobra.Command{
	Use:   "inspect",
	Short: "Inspect stream data on source database",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()

		// Valid stream id?
		streamId, err := shared.StreamIdFromString(args[0])
		if err != nil {
			return fmt.Errorf("could not parse streamId: %w", err)
		}

		pool, _, err := getSourceDbPool(ctx, true)
		if err != nil {
			return wrapError("Failed to initialize source database pool", err)
		}

		return inspectStream(ctx, pool, streamId.String())
	},
}

var targetInspectCmd = &cobra.Command{
	Use:   "inspect",
	Short: "Inspect stream data on target database",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()

		// Valid stream id?
		streamId, err := shared.StreamIdFromString(args[0])
		if err != nil {
			return fmt.Errorf("could not parse streamId: %w", err)
		}

		pool, _, err := getTargetDbPool(ctx, true)
		if err != nil {
			return wrapError("Failed to initialize target database pool", err)
		}

		return inspectStream(ctx, pool, streamId.String())
	},
}

func init() {
	targetCmd.AddCommand(targetInspectCmd)
	sourceCmd.AddCommand(srcInspectCmd)
}

func queryPartitions(ctx context.Context, pool *pgxpool.Pool, table string) ([]string, error) {
	rows, _ := pool.Query(
		ctx,
		"SELECT inhrelid::regclass AS child FROM pg_catalog.pg_inherits WHERE inhparent = $1::regclass",
		table,
	)
	parts, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, wrapError("Failed to query partitions for "+table, err)
	}
	return parts, nil
}

func chunk(slice [][]string, size int) [][]string {
	var ret [][]string
	for i := 0; i < len(slice); i += size {
		c := slice[i:min(len(slice), i+size)]
		singleChunk := []string{}
		for _, s := range c {
			singleChunk = append(singleChunk, s...)
		}
		ret = append(ret, singleChunk)
	}
	return ret
}

func chunk2[T any](slice []T, size int) [][]T {
	var ret [][]T
	for i := 0; i < len(slice); i += size {
		ret = append(ret, slice[i:min(len(slice), i+size)])
	}
	return ret
}

func rollbackTx(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}

func executeSqlInTx(ctx context.Context, pool *pgxpool.Pool, sql []string, progressCounter *atomic.Int64) error {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{
		IsoLevel:   pgx.ReadCommitted,
		AccessMode: pgx.ReadWrite,
	})
	if err != nil {
		return wrapError("Failed to begin transaction", err)
	}
	defer rollbackTx(ctx, tx)

	batch := &pgx.Batch{}
	for _, s := range sql {
		batch.Queue(s)
	}

	err = tx.SendBatch(ctx, batch).Close()
	if err != nil {
		return fmt.Errorf("failed to execute SQL batch for %d queries %v: %w", len(sql), sql, err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return wrapError("Failed to commit transaction", err)
	}

	progressCounter.Add(int64(len(sql)))

	return nil
}

func executeSql(ctx context.Context, pool *pgxpool.Pool, sql []string, progressCounter *atomic.Int64) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return wrapError("Failed to acquire connection", err)
	}
	defer conn.Release()

	for _, s := range sql {
		_, err = conn.Exec(ctx, s)
		if err != nil {
			return fmt.Errorf("failed to execute SQL '%s': %w", s, err)
		}
		progressCounter.Add(1)
	}

	return nil
}

func getStreamIds(ctx context.Context, pool *pgxpool.Pool) ([]string, []int64, []bool, error) {
	rows, _ := pool.Query(ctx, "SELECT stream_id, latest_snapshot_miniblock, migrated FROM es ORDER BY stream_id")

	var ids []string
	var miniblocks []int64
	var migrateds []bool
	var id string
	var miniblock int64
	var migrated bool
	_, err := pgx.ForEachRow(rows, []any{&id, &miniblock, &migrated}, func() error {
		ids = append(ids, id)
		miniblocks = append(miniblocks, miniblock)
		migrateds = append(migrateds, migrated)
		return nil
	})
	if err != nil {
		return nil, nil, nil, wrapError("Failed to read es table", err)
	}
	return ids, miniblocks, migrateds, nil
}

func getNumPartitionSettings(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	var numPartitions int
	err := pool.QueryRow(
		ctx,
		"select num_partitions from settings where single_row_key=true",
	).Scan(&numPartitions)
	if err != nil {
		return 0, err
	}

	return numPartitions, nil
}

func reportProgress(message string, progressCounter *atomic.Int64) {
	lastProgress := progressCounter.Load()
	startTime := time.Now()
	lastTime := startTime
	interval := viper.GetDuration("RIVER_DB_PROGRESS_REPORT_INTERVAL")
	if interval <= 0 {
		interval = 10 * time.Second
	}
	for {
		time.Sleep(interval)
		currentProgress := progressCounter.Load()
		if currentProgress != lastProgress {
			delta := currentProgress - lastProgress
			now := time.Now()
			fmt.Println(
				message,
				currentProgress,
				"in",
				now.Sub(startTime).Round(time.Second),
				fmt.Sprintf("%.1f", float64(delta)/now.Sub(lastTime).Seconds()),
				"per second",
			)
			lastProgress = currentProgress
			lastTime = now
		}
	}
}

func executeSqlInParallel(ctx context.Context, pool *pgxpool.Pool, sql [][]string, message string, inTx bool) error {
	numWorkers := viper.GetInt("RIVER_DB_NUM_WORKERS")
	txSize := viper.GetInt("RIVER_DB_TX_SIZE")
	if txSize <= 0 {
		txSize = 1
	}

	workerPool := workerpool.New(numWorkers)

	workItems := chunk(sql, txSize)

	progressCounter := &atomic.Int64{}
	for _, workItem := range workItems {
		workerPool.Submit(func() {
			var err error
			if inTx {
				err = executeSqlInTx(ctx, pool, workItem, progressCounter)
			} else {
				err = executeSql(ctx, pool, workItem, progressCounter)
			}
			if err != nil {
				fmt.Println("ERROR:", err)
				os.Exit(1)
			}
		})
	}

	go reportProgress(message, progressCounter)

	workerPool.StopWait()

	return nil
}

func executeInParallel[T any](
	ctx context.Context,
	workitems []T,
	message string,
	fn func(ctx context.Context, items []T) error,
) error {
	numWorkers := viper.GetInt("RIVER_DB_NUM_WORKERS")
	txSize := viper.GetInt("RIVER_DB_TX_SIZE")
	if txSize <= 0 {
		txSize = 1
	}

	workerPool := workerpool.New(numWorkers)

	workItems := chunk2(workitems, txSize)

	progressCounter := &atomic.Int64{}
	for _, workitem := range workItems {
		workerPool.Submit(func() {
			err := fn(ctx, workitem)
			if err != nil {
				fmt.Println("ERROR:", err)
				os.Exit(1)
			}
			progressCounter.Add(int64(len(workitem)))
		})
	}

	go reportProgress(message, progressCounter)

	workerPool.StopWait()

	fmt.Println("Final:", message, progressCounter.Load())

	return nil
}

func executeInParallelInTx[T any](
	ctx context.Context,
	pool *pgxpool.Pool,
	workitems []T,
	message string,
	fn func(ctx context.Context, tx pgx.Tx, items []T) error,
) error {
	return executeInParallel(ctx, workitems, message, func(ctx context.Context, items []T) error {
		tx, err := pool.BeginTx(ctx, pgx.TxOptions{
			IsoLevel:   pgx.ReadCommitted,
			AccessMode: pgx.ReadWrite,
		})
		defer rollbackTx(ctx, tx)

		if err != nil {
			return wrapError("Failed to begin transaction", err)
		}
		err = fn(ctx, tx, items)
		if err != nil {
			return err
		}

		err = tx.Commit(ctx)
		if err != nil {
			return wrapError("Failed to commit transaction", err)
		}
		return nil
	})
}

func printPartitions(ctx context.Context, pool *pgxpool.Pool) error {
	parts, err := queryPartitions(ctx, pool, "minipools")
	if err != nil {
		return wrapError("Failed to query partitions for minipools", err)
	}
	for _, p := range parts {
		fmt.Println(p)
	}

	parts, err = queryPartitions(ctx, pool, "miniblocks")
	if err != nil {
		return wrapError("Failed to query partitions for miniblocks", err)
	}
	for _, p := range parts {
		fmt.Println(p)
	}

	parts, err = queryPartitions(ctx, pool, "miniblock_candidates")
	if err != nil {
		return wrapError("Failed to query partitions for miniblock_candidates", err)
	}
	for _, p := range parts {
		fmt.Println(p)
	}
	return nil
}

var targetListPCmd = &cobra.Command{
	Use:   "list_partitions",
	Short: "List target database partitions",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, _, err := getTargetDbPool(ctx, true)
		if err != nil {
			return err
		}

		return printPartitions(ctx, pool)
	},
}

func init() {
	targetCmd.AddCommand(targetListPCmd)
}

var targetDropCmd = &cobra.Command{
	Use:   "drop_drop_drop",
	Short: "Advanced: Destructive: Drop target database schema",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, info, err := getTargetDbPool(ctx, true)
		if err != nil {
			return err
		}

		rows, _ := pool.Query(ctx, "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = $1", info.schema)
		tables, err := pgx.CollectRows(rows, pgx.RowTo[string])
		if err != nil {
			return wrapError("Failed to list tables in target schema", err)
		}

		sql := [][]string{}
		for _, table := range tables {
			if strings.HasPrefix(table, "miniblock_candidates_") || strings.HasPrefix(table, "miniblocks_") ||
				strings.HasPrefix(table, "minipools_") {
				sql = append(sql, []string{fmt.Sprintf("DROP TABLE IF EXISTS \"%s\"", table)})
			}
		}

		if len(sql) != 0 {
			err = executeSqlInParallel(ctx, pool, sql, "Tables dropped:", false)
			if err != nil {
				return err
			}
			fmt.Println("Finished dropping partitions:", len(sql))
		}

		fmt.Println("Dropping schema and top tables", info.schema)
		_, err = pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS \"%s\" CASCADE", info.schema))
		if err != nil {
			return fmt.Errorf("failed to drop schema %s: %w", info.schema, err)
		}

		return nil
	},
}

func init() {
	targetCmd.AddCommand(targetDropCmd)
}

func deleteStream(ctx context.Context, tx pgx.Tx, streamId string) error {
	_, err := tx.Exec(ctx, "DELETE FROM es WHERE stream_id = $1", streamId)
	if err != nil {
		return fmt.Errorf("failed to delete stream %s: %w", streamId, err)
	}

	mp_part := getPartitionName("minipools", streamId, 256)
	_, err = tx.Exec(ctx, "DELETE FROM "+mp_part+" WHERE stream_id = $1", streamId)
	if err != nil {
		return fmt.Errorf("failed to delete minipools partition %s: %w", mp_part, err)
	}

	mb_part := getPartitionName("miniblocks", streamId, 256)
	_, err = tx.Exec(ctx, "DELETE FROM "+mb_part+" WHERE stream_id = $1", streamId)
	if err != nil {
		return fmt.Errorf("failed to delete miniblocks partition %s: %w", mb_part, err)
	}

	cand_part := getPartitionName("miniblock_candidates", streamId, 256)
	_, err = tx.Exec(ctx, "DELETE FROM "+cand_part+" WHERE stream_id = $1", streamId)
	if err != nil {
		return fmt.Errorf("failed to delete miniblock_candidates partition %s: %w", cand_part, err)
	}

	return nil
}

var targetWipeCmd = &cobra.Command{
	Use:   "wipe_wipe_wipe",
	Short: "Advanced: Destructive: Delete all data from target database",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, _, err := getTargetDbPool(ctx, true)
		if err != nil {
			return err
		}

		streamIds, _, _, err := getStreamIds(ctx, pool)
		if err != nil {
			return wrapError("Failed to get stream ids from target", err)
		}

		return executeInParallelInTx(
			ctx,
			pool,
			streamIds,
			"Streams deleted:",
			func(ctx context.Context, tx pgx.Tx, streamIds []string) error {
				for _, id := range streamIds {
					err = deleteStream(ctx, tx, id)
					if err != nil {
						return err
					}
				}
				return nil
			},
		)
	},
}

func init() {
	targetCmd.AddCommand(targetWipeCmd)
}

func fixSchema(ctx context.Context, tx pgx.Tx, partition string) error {
	_, err := tx.Exec(ctx, "ALTER TABLE "+partition+" ALTER COLUMN envelope DROP NOT NULL")
	if err != nil {
		return fmt.Errorf("failed to alter partition %s: %w", partition, err)
	}
	return nil
}

var targetFixSchemaCmd = &cobra.Command{
	Use:   "fix_schema",
	Short: "Advanced: Fix target database schema broken by previous migrations",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, _, err := getTargetDbPool(ctx, true)
		if err != nil {
			return err
		}

		partitions, err := queryPartitions(ctx, pool, "minipools")
		if err != nil {
			return wrapError("Failed to get partitions from target", err)
		}

		fmt.Println("Fixing schema for", len(partitions), "partitions")

		return executeInParallelInTx(
			ctx,
			pool,
			partitions,
			"Partitions fixed:",
			func(ctx context.Context, tx pgx.Tx, partitions []string) error {
				for _, partition := range partitions {
					err = fixSchema(ctx, tx, partition)
					if err != nil {
						return err
					}
				}
				return nil
			},
		)
	},
}

func init() {
	targetCmd.AddCommand(targetFixSchemaCmd)
}

var copyBypass = false

func tableExists(
	ctx context.Context,
	pool *pgxpool.Conn,
	info *dbInfo,
	tableName string,
) (bool, error) {
	var exists bool
	err := pool.QueryRow(
		ctx,
		fmt.Sprintf(
			`SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = '%s' 
			AND table_name = '%s'
			);`,
			info.schema,
			tableName,
		),
	).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func insertMinipoolsPlaceholder(
	ctx context.Context,
	source *pgxpool.Conn,
	tx pgx.Tx,
	streamId string,
	targetSchemaMetadata schemaMetadata,
) error {
	srcMiniblocks := getPartitionName("miniblocks", streamId, 256)
	targetMinipools := getPartitionName("minipools", streamId, targetSchemaMetadata.numPartitions)

	if verbose {
		fmt.Printf(
			"Querying %v to determine generation for creating placeholder in %v for stream %v...\n",
			srcMiniblocks,
			targetMinipools,
			streamId,
		)
	}

	var lastMbNumInStorage *int64
	if err := source.QueryRow(
		ctx,
		fmt.Sprintf("SELECT MAX(seq_num) FROM %v WHERE stream_id = $1", srcMiniblocks),
		streamId,
	).Scan(&lastMbNumInStorage); err != nil {
		return err
	}

	// Some streams may have no miniblocks in storage. In that case, just insert a placeholder for
	// generation 0.
	if lastMbNumInStorage == nil {
		mb := int64(-1)
		lastMbNumInStorage = &mb
		fmt.Printf("WARNING: no miniblocks in storage found for stream %v\n", streamId)
	}

	_, err := tx.Exec(
		ctx,
		fmt.Sprintf("INSERT INTO %v (stream_id, generation, slot_num) VALUES ($1, $2, -1)", targetMinipools),
		streamId,
		*lastMbNumInStorage+1,
	)
	return err
}

func copyPart(
	ctx context.Context,
	source *pgxpool.Conn,
	tx pgx.Tx,
	streamId string,
	table string,
	force bool,
	sourceInfo *dbInfo,
	targetSchemaMetadata schemaMetadata,
) error {
	srcPartition := getPartitionName(table, streamId, 256)
	targetPartition := getPartitionName(table, streamId, targetSchemaMetadata.numPartitions)

	if verbose {
		fmt.Printf("Querying %v to copy to %v for stream %v...\n", srcPartition, targetPartition, streamId)
	}

	// check for existence of miniblock_candidates table since we did not migrate legacy streams to have
	// partitions for these. Do not consider the copy an error if they do not exist.
	if table == "miniblock_candidates" {
		exists, err := tableExists(ctx, source, sourceInfo, srcPartition)
		if err != nil {
			fmt.Println("Error determining table existence:", err)
			os.Exit(1)
		}
		if !exists {
			if verbose {
				fmt.Printf(
					"WARN: miniblock_candidates partition %s does not exist for stream %s, skipping copy\n",
					srcPartition,
					streamId,
				)
			}
			return nil
		}
	}

	rows, err := source.Query(
		ctx,
		fmt.Sprintf("SELECT * FROM %s WHERE stream_id = $1", srcPartition),
		streamId,
	)
	if err != nil {
		return fmt.Errorf("error: Failed to query %s on source db for stream %s: %w", srcPartition, streamId, err)
	}
	defer rows.Close()

	if force {
		_, err = tx.Exec(
			ctx,
			fmt.Sprintf("DELETE FROM %s WHERE stream_id = $1", targetPartition),
			streamId,
		)
		if err != nil {
			return fmt.Errorf("failed to delete from %s for stream %s: %w", targetPartition, streamId, err)
		}
	}

	columnNames := []string{}
	for _, desc := range rows.FieldDescriptions() {
		columnNames = append(columnNames, desc.Name)
	}

	var rowData [][]any
	if copyBypass {
		_, err = tx.CopyFrom(ctx, pgx.Identifier{targetPartition}, columnNames, rows)
	} else {
		rowData, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) ([]any, error) {
			return r.Values()
		})
		if err == nil {
			_, err = tx.CopyFrom(ctx, pgx.Identifier{targetPartition}, columnNames, pgx.CopyFromRows(rowData))
		}
	}
	if err != nil {
		fmt.Println("DEBUG: columns", columnNames)
		if rowData != nil {
			fmt.Println("DEBUG: rows", rowData)
		}
		return fmt.Errorf(
			"failed to copy from %s to %s for stream %s: %w",
			srcPartition,
			targetPartition,
			streamId,
			err,
		)
	}
	return nil
}

func copyStream(
	ctx context.Context,
	source *pgxpool.Conn,
	tx pgx.Tx,
	streamId string,
	force bool,
	sourceInfo *dbInfo,
	targetSchemaMetadata schemaMetadata,
) error {
	if verbose {
		fmt.Println("Copy stream:", streamId)
	}

	var latestSnapshotMiniblock int64
	err := source.QueryRow(ctx, "SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1", streamId).
		Scan(&latestSnapshotMiniblock)
	if err != nil {
		return wrapError("Failed to read latest snapshot miniblock for stream "+streamId, err)
	}

	// TODO: if migrated field changes, delete previous tables?
	_, err = tx.Exec(
		ctx,
		`INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated) 
        VALUES ($1, $2, $3)
        ON CONFLICT (stream_id) 
        DO UPDATE SET latest_snapshot_miniblock = $2, migrated = $3`,
		streamId,
		latestSnapshotMiniblock,
		targetSchemaMetadata.migrated,
	)
	if err != nil {
		return wrapError("Failed to insert into es for stream "+streamId, err)
	}

	// Archival nodes do not have minipool records. In this case, we will want to insert a placeholder
	// into the minipools table manually for this stream at the current generation.
	if sourceInfo.isArchiver {
		if err = insertMinipoolsPlaceholder(ctx, source, tx, streamId, targetSchemaMetadata); err != nil {
			return err
		}
	} else {
		err = copyPart(ctx, source, tx, streamId, "minipools", force, sourceInfo, targetSchemaMetadata)
		if err != nil {
			return err
		}
	}

	err = copyPart(ctx, source, tx, streamId, "miniblocks", force, sourceInfo, targetSchemaMetadata)
	if err != nil {
		return err
	}

	// Archiver nodes do not contain candidates, so we can go ahead and skip this.
	if !sourceInfo.isArchiver {
		err = copyPart(ctx, source, tx, streamId, "miniblock_candidates", force, sourceInfo, targetSchemaMetadata)
		if err != nil {
			return err
		}
	}
	return nil
}

type schemaMetadata struct {
	// In practice, a schema may be partially migrated in production. This struct is intended
	// to describe a schema copied into, that is either wholly migrated or unmigrated.
	migrated      bool
	numPartitions int
}

func copyStreams(
	ctx context.Context,
	source *pgxpool.Pool,
	target *pgxpool.Pool,
	streamIds []string,
	force bool,
	sourceInfo *dbInfo,
	targetSchemaMetadata schemaMetadata,
	progressCounter *atomic.Int64,
) error {
	if verbose {
		fmt.Println("Streams copied: ", progressCounter.Load())
		fmt.Println("Copying streams from source to target: ", streamIds)
	}

	sourceConn, err := source.Acquire(ctx)
	if err != nil {
		return wrapError("Failed to acquire source connection", err)
	}
	defer sourceConn.Release()

	tx, err := target.BeginTx(ctx, pgx.TxOptions{
		IsoLevel:   pgx.ReadCommitted,
		AccessMode: pgx.ReadWrite,
	})
	if err != nil {
		return wrapError("Failed to begin transaction", err)
	}
	defer rollbackTx(ctx, tx)

	for _, id := range streamIds {
		err = copyStream(ctx, sourceConn, tx, id, force, sourceInfo, targetSchemaMetadata)
		if err != nil {
			return wrapError("Failed to copy stream "+id, err)
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		return wrapError("Failed to commit transaction", err)
	}

	progressCounter.Add(int64(len(streamIds)))

	return nil
}

func filterStreamList(original []string, filtered []shared.StreamId) []string {
	filteredStreamUsed := make(map[string]bool)
	for _, id := range filtered {
		filteredStreamUsed[id.String()] = false
	}

	outputList := make([]string, 0, len(filtered))
	for _, id := range original {
		if _, ok := filteredStreamUsed[id]; ok {
			filteredStreamUsed[id] = true
			outputList = append(outputList, id)
		}
	}

	for id, used := range filteredStreamUsed {
		if !used {
			log.Printf("WARNING: stream %v is in filter list, but does not exist in the source DB", id)
		}
	}

	return outputList
}

func copyData(
	ctx context.Context,
	source *pgxpool.Pool,
	target *pgxpool.Pool,
	force bool,
	sourceInfo *dbInfo,
	filterStreamIds []shared.StreamId,
) error {
	sourceStreamIds, _, _, err := getStreamIds(ctx, source)
	if err != nil {
		return wrapError("Failed to get stream ids from source", err)
	}

	if len(filterStreamIds) > 0 {
		if verbose {
			fmt.Printf(
				"Filtering stream list, %d streams total, %d to copy\n",
				len(sourceStreamIds),
				len(filterStreamIds),
			)
		}
		sourceStreamIds = filterStreamList(sourceStreamIds, filterStreamIds)
		if verbose {
			fmt.Printf(
				"Filtered stream list length is %d\n",
				len(sourceStreamIds),
			)
		}
	}

	existingStreamIds, _, _, err := getStreamIds(ctx, target)
	if err != nil {
		return wrapError("Failed to get stream ids from target", err)
	}

	existingStreamIdsMap := map[string]bool{}
	for _, id := range existingStreamIds {
		existingStreamIdsMap[id] = true
	}

	newStreamIds := []string{}
	if !force {
		for _, id := range sourceStreamIds {
			if !existingStreamIdsMap[id] {
				newStreamIds = append(newStreamIds, id)
			}
		}
	} else {
		newStreamIds = sourceStreamIds
	}

	fmt.Println("Streams to copy:", len(newStreamIds))

	if verbose {
		for _, streamId := range newStreamIds {
			fmt.Println(streamId)
		}
		fmt.Println()
	}

	numWorkers := viper.GetInt("RIVER_DB_NUM_WORKERS")
	txSize := viper.GetInt("RIVER_DB_TX_SIZE")
	if txSize <= 0 {
		txSize = 1
	}

	var targetSchemaMetadata schemaMetadata
	fmt.Println("Reading partition settings from target database...")
	numPartitions, err := getNumPartitionSettings(ctx, target)
	if err != nil {
		fmt.Println("Error reading partition settings: ", err)
		os.Exit(1)
	}
	fmt.Println("Target database partitions:", numPartitions)

	targetSchemaMetadata.migrated = true
	targetSchemaMetadata.numPartitions = numPartitions

	workerPool := workerpool.New(numWorkers)
	workItems := chunk2(newStreamIds, txSize)

	var progressCounter atomic.Int64
	for _, workItem := range workItems {
		workerPool.Submit(func() {
			err := copyStreams(ctx, source, target, workItem, force, sourceInfo, targetSchemaMetadata, &progressCounter)
			if err != nil {
				fmt.Println("ERROR:", err)
				os.Exit(1)
			}
		})
	}

	go reportProgress("Streams copied:", &progressCounter)

	workerPool.StopWait()

	fmt.Println("Final: Streams copied:", progressCounter.Load())

	return nil
}

func readStreamIdFile(path string) []shared.StreamId {
	file, err := os.Open(path)
	if err != nil {
		log.Fatalf("failed opening file: %s", err)
	}
	defer file.Close()

	// Create a scanner to read the file line by line
	scanner := bufio.NewScanner(file)
	streamIds := make([]shared.StreamId, 0, 34000)

	for scanner.Scan() {
		line := scanner.Text()
		// Ignore commented lines
		if len(line) > 0 && line[0] == '#' {
			continue
		}

		streamId, err := shared.StreamIdFromString(line)
		if err != nil {
			log.Printf("Error: Unable to parse '%v' as a streamId", line)
			continue
		}

		streamIds = append(streamIds, streamId)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Scanner error: %s", err)
	}

	return streamIds
}

var (
	copyCmdForce             bool
	copyCmdFromArchiver      bool
	copyCmdFilterStreamsFile string
	copyCmd                  = &cobra.Command{
		Use:   "copy",
		Short: "Copy data from source to target database",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			sourcePool, sourceInfo, err := getSourceDbPool(ctx, true)
			if err != nil {
				return err
			}
			err = testDbConnection(ctx, sourcePool, sourceInfo)
			if err != nil {
				return err
			}
			sourceInfo.isArchiver = copyCmdFromArchiver
			var filteredStreamIds []shared.StreamId
			if sourceInfo.isArchiver {
				if copyCmdFilterStreamsFile == "" {
					log.Fatalf("Error: if copy source is archival, a file to filter stream ids is required")
				}
				filteredStreamIds = readStreamIdFile(copyCmdFilterStreamsFile)
			}

			targetPool, targetInfo, err := getTargetDbPool(ctx, true)
			if err != nil {
				return err
			}
			err = testDbConnection(ctx, targetPool, targetInfo)
			if err != nil {
				return err
			}

			return copyData(ctx, sourcePool, targetPool, copyCmdForce, sourceInfo, filteredStreamIds)
		},
	}
)

func init() {
	rootCmd.AddCommand(copyCmd)
	copyCmd.Flags().
		BoolVar(&copyCmdFromArchiver, "from-archiver", false, "Mark the source database as an archiver backup and force the creation of minipool entries")
	copyCmd.Flags().BoolVar(&copyCmdForce, "force", false, "Force copy even if target already has data")
	copyCmd.Flags().BoolVar(&copyBypass, "bypass", false, "Bypass reading data into memory (another copy method)")
	copyCmd.Flags().
		StringVar(&copyCmdFilterStreamsFile, "filter-streams-file", "", "File with the subset of streams to copy from the archiver in order to restore a node. If the copy is from an archiver, this must be a valid file with stream ids.")
}

func lastSnapshotIndexFromMiniblocks(
	ctx context.Context,
	target *pgxpool.Pool,
	streamId string,
) (int64, error) {
	table := getPartitionName("miniblocks", streamId, 256)
	query := fmt.Sprintf(
		"SELECT seq_num, blockdata from %s WHERE stream_id = $1 ORDER BY seq_num DESC LIMIT 101;",
		table,
	)
	rows, err := target.Query(
		ctx,
		query,
		streamId,
	)
	if err != nil {
		return int64(0), fmt.Errorf("error reading miniblocks from stream: %w", err)
	}

	noError := fmt.Errorf("no error - terminate pgx.ForEachRow as soon as result is found")
	var seqNum int64
	var blockData []byte

	var printMaxSeqNum bool
	if _, err := pgx.ForEachRow(
		rows,
		[]any{&seqNum, &blockData},
		func() error {
			mbInfo, err := events.NewMiniblockInfoFromDescriptorWithOpts(
				&storage.MiniblockDescriptor{Number: seqNum, Data: blockData},
				events.NewParsedMiniblockInfoOpts().WithDoNotParseEvents(true),
			)
			if err != nil {
				return fmt.Errorf("could not parse miniblock for stream %v: %w", streamId, err)
			}

			if seqNum > 0 && !printMaxSeqNum && verbose {
				fmt.Printf("debug -- stream %s max seq_num %d\n", streamId, seqNum)
				printMaxSeqNum = true
			}

			if mbInfo.Snapshot != nil {
				if verbose {
					fmt.Printf("debug -- saw a snapshot for stream %s, seq_num %d\n", streamId, seqNum)
				}
				return noError
			}
			return nil
		},
	); err != nil && err != noError {
		return int64(0), err
	}

	return seqNum, nil
}

func writeLastSnapshotMiniblock(
	ctx context.Context,
	target *pgxpool.Pool,
	streamIds []string,
	progressCounter *atomic.Int64,
) error {
	tx, err := target.BeginTx(ctx, pgx.TxOptions{
		IsoLevel:   pgx.ReadCommitted,
		AccessMode: pgx.ReadWrite,
	})
	if err != nil {
		return wrapError("failed to begin transaction", err)
	}
	defer rollbackTx(ctx, tx)

	for _, streamId := range streamIds {
		lastSnapshotIndex, err := lastSnapshotIndexFromMiniblocks(ctx, target, streamId)
		if err != nil {
			return fmt.Errorf("failed to determine last snapshot miniblock index for stream %v: %w", streamId, err)
		}

		if _, err := tx.Exec(
			ctx,
			"UPDATE es SET latest_snapshot_miniblock = $1 WHERE stream_id = $2",
			lastSnapshotIndex,
			streamId,
		); err != nil {
			return fmt.Errorf(
				"failed to update snapshot index of stream %v to %d: %w",
				streamId,
				lastSnapshotIndex,
				err,
			)
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		return wrapError("Failed to commit transaction", err)
	}

	progressCounter.Add(int64(len(streamIds)))
	return nil
}

func restoreSnapshotIndices(
	ctx context.Context,
	target *pgxpool.Pool,
	filteredStreamIds []shared.StreamId,
) error {
	streamIds, _, _, err := getStreamIds(ctx, target)
	if len(filteredStreamIds) > 0 {
		streamIds = filterStreamList(streamIds, filteredStreamIds)
	}
	if err != nil {
		return fmt.Errorf("unable to get existing stream ids: %w", err)
	}

	if verbose {
		fmt.Printf("Restoring %d streams\n", len(streamIds))
	}

	numWorkers := viper.GetInt("RIVER_DB_NUM_WORKERS")
	txSize := viper.GetInt("RIVER_DB_TX_SIZE")
	if txSize <= 0 {
		txSize = 1
	}

	workerPool := workerpool.New(numWorkers)
	workItems := chunk2(streamIds, txSize)

	var progressCounter atomic.Int64
	for _, workItem := range workItems {
		workerPool.Submit(func() {
			err := writeLastSnapshotMiniblock(ctx, target, workItem, &progressCounter)
			if err != nil {
				fmt.Println("ERROR:", err)
				fmt.Println("Streams that were not updated: ", workItem)
			}
		})
	}

	go reportProgress("Streams updated:", &progressCounter)

	workerPool.StopWait()
	return nil
}

var (
	restoreSnapshotIndicesCmdFilterStreamsFile string
	restoreSnapshotIndicesCmd                  = &cobra.Command{
		Use:   "restore-snapshot-indices",
		Short: "Restore snapshot indices to data that was copied from an archiver backup",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()
			targetPool, targetInfo, err := getTargetDbPool(ctx, true)
			if err != nil {
				return err
			}
			err = testDbConnection(ctx, targetPool, targetInfo)
			if err != nil {
				return err
			}

			var filteredStreamIds []shared.StreamId
			if restoreSnapshotIndicesCmdFilterStreamsFile != "" {
				filteredStreamIds = readStreamIdFile(restoreSnapshotIndicesCmdFilterStreamsFile)
			}

			return restoreSnapshotIndices(ctx, targetPool, filteredStreamIds)
		},
	}
)

func init() {
	restoreSnapshotIndicesCmd.Flags().
		StringVar(&restoreSnapshotIndicesCmdFilterStreamsFile, "filter-streams-file", "", "File with the subset of streams to copy from the archiver in order to restore a node.")

	targetCmd.AddCommand(restoreSnapshotIndicesCmd)
}

func compareTableCounts(
	ctx context.Context,
	source *pgxpool.Conn,
	target *pgxpool.Conn,
	targetSchemaMetadata schemaMetadata,
	streamId string,
	table string,
) error {
	srcPartition := getPartitionName(table, streamId, 256)
	targetPartition := getPartitionName(table, streamId, targetSchemaMetadata.numPartitions)

	var sourceCount int
	err := source.QueryRow(ctx, fmt.Sprintf("SELECT count(*) FROM %s WHERE stream_id = $1", srcPartition), streamId).
		Scan(&sourceCount)
	if err != nil {
		return fmt.Errorf("failed to read count of %s for stream %s from source: %w", srcPartition, streamId, err)
	}

	var targetCount int
	err = target.QueryRow(ctx, fmt.Sprintf("SELECT count(*) FROM %s WHERE stream_id = $1", targetPartition), streamId).
		Scan(&targetCount)
	if err != nil {
		return fmt.Errorf("failed to read count of %s for stream %s from target: %w", targetPartition, streamId, err)
	}

	if sourceCount != targetCount {
		return fmt.Errorf(
			"count mismatch: source %d, target %d, source partition %s, target partition %s, stream %s",
			sourceCount,
			targetCount,
			srcPartition,
			targetPartition,
			streamId,
		)
	}
	return nil
}

func compareAllTableCounts(
	ctx context.Context,
	sourcePool *pgxpool.Pool,
	targetPool *pgxpool.Pool,
	targetSchemaMetadata schemaMetadata,
	streamId string,
) error {
	sourceConn, err := sourcePool.Acquire(ctx)
	if err != nil {
		return wrapError("Failed to acquire source connection", err)
	}
	defer sourceConn.Release()

	targetConn, err := targetPool.Acquire(ctx)
	if err != nil {
		return wrapError("Failed to acquire target connection", err)
	}
	defer targetConn.Release()

	err = compareTableCounts(ctx, sourceConn, targetConn, targetSchemaMetadata, streamId, "minipools")
	if err != nil {
		return err
	}
	err = compareTableCounts(ctx, sourceConn, targetConn, targetSchemaMetadata, streamId, "miniblocks")
	if err != nil {
		return err
	}
	err = compareTableCounts(ctx, sourceConn, targetConn, targetSchemaMetadata, streamId, "miniblock_candidates")
	if err != nil {
		return err
	}
	return nil
}

func compareAllTableContents(
	ctx context.Context,
	sourcePool *pgxpool.Pool,
	targetPool *pgxpool.Pool,
	sourceInfo *dbInfo,
	targetSchemaMetadata schemaMetadata,
	streamId string,
) error {
	sourceConn, err := sourcePool.Acquire(ctx)
	if err != nil {
		return wrapError("Failed to acquire source connection", err)
	}
	defer sourceConn.Release()

	targetConn, err := targetPool.Acquire(ctx)
	if err != nil {
		return wrapError("Failed to acquire target connection", err)
	}
	defer targetConn.Release()

	err = compareMiniblockContents(ctx, sourceConn, targetConn, targetSchemaMetadata, streamId)
	if err != nil {
		return err
	}

	err = compareMiniblockCandidateContents(ctx, sourceConn, targetConn, sourceInfo, targetSchemaMetadata, streamId)
	if err != nil {
		return err
	}

	err = compareMinipoolContents(ctx, sourceConn, targetConn, targetSchemaMetadata, streamId)
	if err != nil {
		return err
	}

	return nil
}

func compareMiniblockContents(
	ctx context.Context,
	source *pgxpool.Conn,
	target *pgxpool.Conn,
	targetSchemaMetadata schemaMetadata,
	streamId string,
) error {
	srcPartition := getPartitionName("miniblocks", streamId, 256)
	targetPartition := getPartitionName("miniblocks", streamId, targetSchemaMetadata.numPartitions)

	rows, err := source.Query(
		ctx,
		fmt.Sprintf("SELECT seq_num, blockdata FROM %s WHERE stream_id = $1 order by seq_num", srcPartition),
		streamId,
	)
	if err != nil {
		return fmt.Errorf("failed to read miniblocks for stream %s from source %s: %w", streamId, srcPartition, err)
	}
	sourceMiniblocks := make([][]byte, 0)

	for rows.Next() {
		var seqNum int64
		var blockdata []byte
		if err := rows.Scan(&seqNum, &blockdata); err != nil {
			return fmt.Errorf("error reading miniblock row from src: %w", err)
		}

		if seqNum != int64(len(sourceMiniblocks)) {
			return fmt.Errorf(
				"consistency error in source miniblocks; expected seqNum %d but saw %d",
				len(sourceMiniblocks),
				seqNum,
			)
		}
		sourceMiniblocks = append(sourceMiniblocks, blockdata)
	}

	rows, err = target.Query(
		ctx,
		fmt.Sprintf(
			"SELECT seq_num, blockdata FROM %s WHERE stream_id = $1 order by seq_num",
			targetPartition,
		),
		streamId,
	)
	if err != nil {
		return fmt.Errorf("failed to read miniblocks for stream %s from target %s: %w", streamId, targetPartition, err)
	}
	targetMiniblocks := make([][]byte, 0)

	for rows.Next() {
		var seqNum int64
		var blockdata []byte
		if err := rows.Scan(&seqNum, &blockdata); err != nil {
			return fmt.Errorf("error reading miniblock row from target: %w", err)
		}
		if seqNum != int64(len(targetMiniblocks)) {
			return fmt.Errorf(
				"consistency error in target miniblocks; expected seqNum %d but saw %d",
				len(targetMiniblocks),
				seqNum,
			)
		}
		targetMiniblocks = append(targetMiniblocks, blockdata)
	}

	if len(sourceMiniblocks) != len(targetMiniblocks) {
		return fmt.Errorf(
			"source and target miniblock count do not match for stream %v, %d on %s v %d on %s",
			streamId,
			len(sourceMiniblocks),
			srcPartition,
			len(targetMiniblocks),
			targetPartition,
		)
	}

	for i, srcBlockdata := range sourceMiniblocks {
		targetBlockdata := targetMiniblocks[i]
		if !bytes.Equal(srcBlockdata, targetBlockdata) {
			return fmt.Errorf("miniblock content mismatch for seqNum %d on stream %s", i, streamId)
		}
	}

	if verbose {
		fmt.Printf("  stream %s miniblock contents match\n", streamId)
	}
	return nil
}

func compareMiniblockCandidateContents(
	ctx context.Context,
	source *pgxpool.Conn,
	target *pgxpool.Conn,
	sourceInfo *dbInfo,
	targetSchemaMetadata schemaMetadata,
	streamId string,
) error {
	srcPartition := getPartitionName("miniblock_candidates", streamId, 256)
	targetPartition := getPartitionName("miniblock_candidates", streamId, targetSchemaMetadata.numPartitions)

	exists, err := tableExists(ctx, source, sourceInfo, srcPartition)
	if err != nil {
		return fmt.Errorf("error checking table '%v' existence: %w", srcPartition, err)
	}

	// Multimap: seq_num -> hash -> block data
	srcCandidates := make(map[int64]map[string][]byte, 0)

	if !exists {
		if verbose {
			fmt.Printf("  WARN: %s does not exist on source for stream %s\n", srcPartition, streamId)
		}
	} else {
		rows, err := source.Query(
			ctx,
			fmt.Sprintf(
				"SELECT seq_num, block_hash, blockdata FROM %s WHERE stream_id = $1 order by seq_num, block_hash",
				srcPartition,
			),
			streamId,
		)
		if err != nil {
			return fmt.Errorf("failed to read miniblock candidates for stream %s from source %s: %w", streamId, srcPartition, err)
		}

		curSeqNum := -1
		var curHashMap map[string][]byte
		for rows.Next() {
			var seqNum int64
			var blockHash string
			var blockdata []byte
			if err := rows.Scan(&seqNum, &blockHash, &blockdata); err != nil {
				return fmt.Errorf("error reading miniblock candidate row from src: %w", err)
			}
			if seqNum != int64(curSeqNum) {
				if len(curHashMap) > 0 {
					srcCandidates[int64(curSeqNum)] = curHashMap
				}
				curSeqNum = int(seqNum)
				curHashMap = map[string][]byte{}
			}

			curHashMap[blockHash] = blockdata
		}
		// Grab hashes for last seqNum
		if len(curHashMap) > 0 {
			srcCandidates[int64(curSeqNum)] = curHashMap
		}
	}

	// Multimap: seq_num -> hash -> block data
	targetCandidates := make(map[int64]map[string][]byte, 0)

	rows, err := target.Query(
		ctx,
		fmt.Sprintf(
			"SELECT seq_num, block_hash, blockdata FROM %s WHERE stream_id = $1 order by seq_num, block_hash",
			targetPartition,
		),
		streamId,
	)
	if err != nil {
		return fmt.Errorf(
			"failed to read miniblock candidates for stream %s from source %s: %w",
			streamId,
			targetPartition,
			err,
		)
	}

	curSeqNum := -1
	var curHashMap map[string][]byte
	for rows.Next() {
		var seqNum int64
		var blockHash string
		var blockdata []byte
		if err := rows.Scan(&seqNum, &blockHash, &blockdata); err != nil {
			return fmt.Errorf("error reading miniblock candidate row from src: %w", err)
		}
		if seqNum != int64(curSeqNum) {
			if len(curHashMap) > 0 {
				targetCandidates[int64(curSeqNum)] = curHashMap
			}
			curSeqNum = int(seqNum)
			curHashMap = map[string][]byte{}
		}

		curHashMap[blockHash] = blockdata
	}
	// Grab hashes for last seqNum
	if len(curHashMap) > 0 {
		targetCandidates[int64(curSeqNum)] = curHashMap
	}

	srcSeqNums := make([]int64, 0, len(srcCandidates))
	for seqNum := range srcCandidates {
		srcSeqNums = append(srcSeqNums, seqNum)
	}

	targetSeqNums := make([]int64, 0, len(targetCandidates))
	for seqNum := range targetCandidates {
		targetSeqNums = append(targetSeqNums, seqNum)
	}

	if len(srcSeqNums) != len(targetSeqNums) {
		return fmt.Errorf(
			"source and target seq number sets do not overlap: %v from %v, %v from %v",
			srcSeqNums,
			srcPartition,
			targetSeqNums,
			targetPartition,
		)
	}
	for i, srcSeqNum := range srcSeqNums {
		if srcSeqNum != targetSeqNums[i] {
			return fmt.Errorf(
				"source and target seq number sets do not overlap: %v from %v, %v from %v",
				srcSeqNums,
				srcPartition,
				targetSeqNums,
				targetPartition,
			)
		}
	}

	for _, seqNum := range srcSeqNums {
		srcHashes := srcCandidates[seqNum]
		targetHashes := targetCandidates[seqNum]

		if len(srcHashes) != len(targetHashes) {
			return fmt.Errorf(
				"source and target candidate sets for seq num %v do not overlap: %v from %v, %v from %v",
				seqNum,
				srcHashes,
				srcPartition,
				targetHashes,
				targetPartition,
			)
		}

		for hash, data := range srcHashes {
			targetData, ok := targetHashes[hash]

			if !ok {
				return fmt.Errorf(
					"source and target candidate sets for seq num %v do not overlap: %v from %v, %v from %v",
					seqNum,
					srcHashes,
					srcPartition,
					targetHashes,
					targetPartition,
				)
			}
			if !bytes.Equal(data, targetData) {
				return fmt.Errorf(
					"source and target candidate block datas for streamId=%s, seqNum=%d, blockhash=%s do not overlap",
					streamId,
					seqNum,
					hash,
				)
			}
		}
	}

	if verbose {
		fmt.Printf("  stream %s miniblock candidate contents match\n", streamId)
	}
	return nil
}

func compareMinipoolContents(
	ctx context.Context,
	source *pgxpool.Conn,
	target *pgxpool.Conn,
	targetSchemaMetadata schemaMetadata,
	streamId string,
) error {
	srcPartition := getPartitionName("minipools", streamId, 256)
	targetPartition := getPartitionName("minipools", streamId, targetSchemaMetadata.numPartitions)

	// Multimap: seq_num -> hash -> block data
	srcGeneration := int64(-1)
	targetGeneration := int64(-1)
	srcEnvelopes := [][]byte{}
	targetEnvelopes := [][]byte{}

	rows, err := source.Query(
		ctx,
		fmt.Sprintf(
			"SELECT generation, slot_num, envelope FROM %s WHERE stream_id = $1 order by generation, slot_num",
			srcPartition,
		),
		streamId,
	)
	if err != nil {
		return fmt.Errorf(
			"failed to read minipool for stream %s from source %s: %w",
			streamId,
			srcPartition,
			err,
		)
	}

	expectedSlotNum := int64(-1)
	for rows.Next() {
		var generation int64
		var slotNum int64
		var envelope []byte
		if err := rows.Scan(&generation, &slotNum, &envelope); err != nil {
			return fmt.Errorf("error reading minipool row from src: %w", err)
		}

		if srcGeneration == -1 {
			srcGeneration = generation
		}

		if srcGeneration != generation {
			return fmt.Errorf(
				"minipool entry for stream %s on %s had unexpected generation: expected %d, saw %d",
				streamId,
				srcPartition,
				srcGeneration,
				generation,
			)
		}

		if expectedSlotNum != slotNum {
			return fmt.Errorf(
				"minipool entry for stream %s on %s had unexpected slot num: expected %d, saw %d",
				streamId,
				srcPartition,
				expectedSlotNum,
				slotNum,
			)
		}
		expectedSlotNum += 1
		if len(srcEnvelopes) != int(slotNum)+1 {
			return fmt.Errorf("slot numbers for stream %s minipool %s nonconsecutive", streamId, srcPartition)
		}

		srcEnvelopes = append(srcEnvelopes, envelope)
	}

	rows, err = target.Query(
		ctx,
		fmt.Sprintf(
			"SELECT generation, slot_num, envelope FROM %s WHERE stream_id = $1 order by generation, slot_num",
			targetPartition,
		),
		streamId,
	)
	if err != nil {
		return fmt.Errorf(
			"failed to read minipool for stream %s from source %s: %w",
			streamId,
			targetPartition,
			err,
		)
	}

	expectedSlotNum = -1
	for rows.Next() {
		var generation int64
		var slotNum int64
		var envelope []byte
		if err := rows.Scan(&generation, &slotNum, &envelope); err != nil {
			return fmt.Errorf("error reading minipool row from src: %w", err)
		}

		if targetGeneration == -1 {
			targetGeneration = generation
		}

		if srcGeneration != targetGeneration {
			return fmt.Errorf(
				"unexpected generation on target partition %s: expected %d, saw %d",
				targetPartition,
				srcGeneration,
				targetGeneration,
			)
		}

		if targetGeneration != generation {
			return fmt.Errorf(
				"minipool entry for stream %s on %s had unexpected generation: expected %d, saw %d",
				streamId,
				targetPartition,
				targetGeneration,
				generation,
			)
		}

		if expectedSlotNum != slotNum {
			return fmt.Errorf(
				"minipool entry for stream %s on %s had unexpected slot num: expected %d, saw %d",
				streamId,
				targetPartition,
				expectedSlotNum,
				slotNum,
			)
		}

		expectedSlotNum += 1
		if len(targetEnvelopes) != int(slotNum)+1 {
			return fmt.Errorf("slot numbers for stream %s minipool %s nonconsecutive", streamId, srcPartition)
		}
		targetEnvelopes = append(targetEnvelopes, envelope)
	}

	if len(srcEnvelopes) != len(targetEnvelopes) {
		return fmt.Errorf(
			"source and target minipool sizes differ: %d on %s, %d on %s",
			len(srcEnvelopes),
			srcPartition,
			len(targetEnvelopes),
			targetPartition,
		)
	}

	for i, srcEnvelope := range srcEnvelopes {
		targetEnvelope := targetEnvelopes[i]

		if !bytes.Equal(srcEnvelope, targetEnvelope) {
			return fmt.Errorf(
				"minipool contents for stream %s differ: envelopes at generation=%d, slot_num=%d differ",
				streamId,
				srcGeneration,
				i-1,
			)
		}
	}

	if verbose {
		fmt.Printf("  stream %s minipool contents match\n", streamId)
	}
	return nil
}

var validateCmd = &cobra.Command{
	Use:   "validate",
	Short: "Validate target database by comparing counts of objects in each table",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()

		sourcePool, sourceInfo, err := getSourceDbPool(ctx, true)
		if err != nil {
			return err
		}

		targetPool, _, err := getTargetDbPool(ctx, true)
		if err != nil {
			return err
		}

		sourceStreamIds, sourceLatest, _, err := getStreamIds(ctx, sourcePool)
		if err != nil {
			return err
		}

		targetStreamIds, targetLatest, _, err := getStreamIds(ctx, targetPool)
		if err != nil {
			return err
		}

		if len(sourceStreamIds) != len(targetStreamIds) {
			return fmt.Errorf("stream count mismatch: source %d, target %d", len(sourceStreamIds), len(targetStreamIds))
		}

		if !slices.Equal(sourceStreamIds, targetStreamIds) {
			return errors.New("stream ids mismatch")
		}

		if !slices.Equal(sourceLatest, targetLatest) {
			return errors.New("latest snapshot miniblock value mismatch")
		}

		fmt.Println("All streams in es table match")

		numWorkers := viper.GetInt("RIVER_DB_NUM_WORKERS")

		workerPool := workerpool.New(numWorkers)

		var targetSchemaMetadata schemaMetadata
		numPartitions, err := getNumPartitionSettings(ctx, targetPool)
		if err != nil {
			fmt.Println("Error reading num_partitions setting from target: ", err)
			os.Exit(1)
		}
		targetSchemaMetadata.numPartitions = numPartitions

		progressCounter := &atomic.Int64{}
		for _, id := range targetStreamIds {
			workerPool.Submit(func() {
				var err error
				if compareBinary {
					err = compareAllTableContents(ctx, sourcePool, targetPool, sourceInfo, targetSchemaMetadata, id)
				} else {
					err = compareAllTableCounts(ctx, sourcePool, targetPool, targetSchemaMetadata, id)
				}
				if err != nil {
					fmt.Println("ERROR:", err)
					os.Exit(1)
				}
				progressCounter.Add(1)
			})
		}

		go reportProgress("Compared streams:", progressCounter)

		workerPool.StopWait()

		fmt.Println("All tables have matching stream contents")
		return nil
	},
}

var compareBinary bool

func init() {
	validateCmd.Flags().
		BoolVarP(&compareBinary, "compary_binary", "b", false, "Compare binary stream data on source and target")
	rootCmd.AddCommand(validateCmd)
}

func main() {
	viper.AutomaticEnv()
	viper.SetConfigName("river_migrate_db")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	err := viper.ReadInConfig()
	if err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Println("WARN: Config not loaded:", err)
		} else {
			fmt.Println("ERROR: Config not loaded:", err)
			os.Exit(1)
		}
	}

	err = rootCmd.ExecuteContext(context.Background())
	if err != nil {
		os.Exit(1)
	}
}
