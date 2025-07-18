package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func wrapError(message string, err error) error {
	return fmt.Errorf("%s: %w", message, err)
}

func getPartitionSuffixes() []string {
	partitions := make([]string, 2*256)
	for i := range 256 {
		partitions[i] = fmt.Sprintf("_r%02x", i)
	}
	for i := range 256 {
		partitions[i+256] = fmt.Sprintf("_m%02x", i)
	}
	return partitions
}

type dbInfo struct {
	url    string
	schema string
}

func getPgxDbPool(
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
	cfg.ConnConfig.OnNotice = func(c *pgconn.PgConn, n *pgconn.Notice) {
		fmt.Printf("NOTICE: %s\n", n.Message)
	}
	if password != "" {
		cfg.ConnConfig.Password = password
	}

	if db.schema != "" {
		cfg.ConnConfig.RuntimeParams["search_path"] = fmt.Sprintf("pg_temp, %v, public", db.schema)
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	return pool, nil
}

func getDbPool(ctx context.Context, requireSchema bool) (*pgxpool.Pool, *dbInfo, error) {
	var info dbInfo
	info.url = viper.GetString("RIVER_DB_URL")
	if info.url == "" {
		return nil, nil, errors.New("database URL is not set: --db or RIVER_DB_URL")
	}
	password := viper.GetString("RIVER_DB_PASSWORD")
	info.schema = viper.GetString("RIVER_DB_SCHEMA")

	pool, err := getPgxDbPool(ctx, info, password, requireSchema)
	if err != nil {
		return nil, nil, wrapError("Failed to initialize source database pool", err)
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
		Use:          "river_audit_db",
		SilenceUsage: true,
	}
	verbose bool
)

func init() {
	rootCmd.PersistentFlags().String("db", "", "Source database URL")
	_ = viper.BindPFlag("RIVER_DB_URL", rootCmd.PersistentFlags().Lookup("db_source"))

	viper.SetDefault("RIVER_DB_PASSWORD", "")

	rootCmd.PersistentFlags().StringP("schema", "i", "", "Schema name (i.e. instance hex id prefixed with 's0x')")
	_ = viper.BindPFlag("RIVER_DB_SCHEMA", rootCmd.PersistentFlags().Lookup("schema"))

	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "Print verbose logs")
}

var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Test database connection",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, info, err := getDbPool(ctx, true)
		if err != nil {
			return err
		}

		fmt.Println("Testing source database connection")
		return testDbConnection(ctx, pool, info)
	},
}

func init() {
	rootCmd.AddCommand(testCmd)
}

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List database contents",
}

var listSchemasCmd = &cobra.Command{
	Use:   "schemas",
	Short: "List database schemas",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, _, err := getDbPool(ctx, false)
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
			fmt.Println(schema)
		}

		return nil
	},
}

func init() {
	listCmd.AddCommand(listSchemasCmd)
	rootCmd.AddCommand(listCmd)
}

func escapeSql(sql string, suffix string) string {
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

func queryAcrossPartitions(sql string, suffixes []string) string {
	unionSql := make([]string, 0, 256*4-1)
	for i, suffix := range suffixes {
		escapedSql := escapeSql(sql, suffix)
		if i > 0 {
			unionSql = append(unionSql, "UNION ALL", escapedSql)
		} else {
			unionSql = append(unionSql, escapedSql)
		}
	}
	return strings.Join(unionSql, " ")
}

func checkCandidates(ctx context.Context, pool *pgxpool.Pool, info *dbInfo) error {
	sql := queryAcrossPartitions(
		"SELECT stream_id, seq_num, count(*) AS total_count FROM {{miniblock_candidates}} GROUP BY stream_id, seq_num",
		getPartitionSuffixes(),
	)
	candidateSql := fmt.Sprintf(
		`
		WITH counts AS (%s)
        SELECT stream_id, seq_num, total_count FROM counts
		WHERE total_count > 0
		ORDER BY total_count DESC;
		`,
		sql,
	)
	rows, err := pool.Query(ctx, candidateSql)
	if err != nil {
		return err
	}
	for rows.Next() {
		var streamIdHex string
		var seqNum int64
		var totalCount int64
		if err := rows.Scan(&streamIdHex, &seqNum, &totalCount); err != nil {
			return fmt.Errorf("error scanning candidate row: %w", err)
		}
		fmt.Println(streamIdHex, seqNum, totalCount)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	return nil
}

var (
	checkCmd = &cobra.Command{
		Use:   "check",
		Short: "Check database contents",
	}

	checkCandidatesCmd = &cobra.Command{
		Use:   "candidates",
		Short: "Check database candidate contents and return streams that have an abnormal amount of candidates",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			pool, info, err := getDbPool(ctx, true)
			if err != nil {
				return err
			}

			return checkCandidates(ctx, pool, info)
		},
	}
)

func init() {
	checkCmd.AddCommand(checkCandidatesCmd)
	rootCmd.AddCommand(checkCmd)
}

func main() {
	viper.AutomaticEnv()
	viper.SetConfigName("river_audit_db")
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

	err = rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}
