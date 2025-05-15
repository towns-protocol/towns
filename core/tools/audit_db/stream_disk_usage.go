package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/olekukonko/tablewriter"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/shared"
)

// Format this with the desired schema name
// This query uses temporary tables that may be written to disk, but they should not last beyond
// the length of the session.
const generateReportSql = `
DO $$
DECLARE
    tbl RECORD;
    r RECORD;
    schema_name TEXT := '{{schemaName}}';

    -- Prefixes, result table names, and size columns
    table_patterns TEXT[] := ARRAY['miniblocks_%', 'miniblock_candidates_%', 'minipools_%'];
    result_tables TEXT[] := ARRAY['tmp_miniblocks', 'tmp_miniblock_candidates', 'tmp_minipools'];
    size_columns  TEXT[] := ARRAY['blockdata', 'blockdata', 'envelope'];
    snapshot_columns TEXT[] := ARRAY['snapshot', 'snapshot', NULL];

    i INT;
    pattern TEXT;
    result_table TEXT;
    data_col TEXT;
    snapshot_col TEXT;
    dyn_sql TEXT;
BEGIN
    -- Create result tables
    FOR i IN 1..array_length(result_tables, 1) LOOP
        EXECUTE format('
            CREATE TEMP TABLE IF NOT EXISTS %I (
                stream_id TEXT,
                total_bytes BIGINT,
                row_count BIGINT,
                snapshot_bytes BIGINT DEFAULT 0,
                total_snapshots BIGINT DEFAULT 0
            ) ON COMMIT DROP',
            result_tables[i]
        );
    END LOOP;

    -- Process each pattern group
    FOR i IN 1..array_length(result_tables, 1) LOOP
        pattern      := table_patterns[i];
        result_table := result_tables[i];
        data_col     := size_columns[i];
        snapshot_col := snapshot_columns[i];

        FOR tbl IN
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = schema_name
              AND table_name LIKE pattern
        LOOP
            BEGIN
                dyn_sql := format(
                    'INSERT INTO %I
                     SELECT stream_id,
					 COALESCE(SUM(octet_length(%I))::BIGINT, 0) as total_bytes,
					 COUNT(*) as row_count
                     FROM %I.%I
                     GROUP BY stream_id',
                    result_table, data_col, schema_name, tbl.table_name
                );

                EXECUTE dyn_sql;

				-- Snapshot size aggregation, if applicable
				IF snapshot_col IS NOT NULL THEN
					dyn_sql := format(
						'WITH agg AS (
							SELECT stream_id,
								SUM(octet_length(%I))::BIGINT AS snapshot_bytes,
								COUNT(*) FILTER (WHERE octet_length(%I) > 0) AS snapshot_count
							FROM %I.%I
							GROUP BY stream_id
						)
						UPDATE %I t
						SET snapshot_bytes = agg.snapshot_bytes,
							total_snapshots = agg.snapshot_count
						FROM agg
						WHERE t.stream_id = agg.stream_id',
						snapshot_col, snapshot_col, schema_name, tbl.table_name, result_table
					);
					EXECUTE dyn_sql;
				END IF;

            EXCEPTION
                WHEN others THEN
                    RAISE NOTICE 'Skipping table % for pattern % due to error: %',
                        tbl.table_name, pattern, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END $$;
`

const viewReportSql = `
SELECT * FROM (
SELECT
    COALESCE(tm.stream_id, tmc.stream_id, tmp.stream_id) AS stream_id,
	(COALESCE(tm.total_bytes, 0) + COALESCE(tmc.total_bytes, 0) + COALESCE(tmp.total_bytes, 0)) as total_bytes,
	COALESCE(tm.total_bytes, 0) AS miniblock_bytes,
	COALESCE(tm.row_count, 0)  AS miniblock_count,
	COALESCE(tm.snapshot_bytes, 0) AS miniblock_snapshot_bytes,
	COALESCE(tm.total_snapshots, 0)  AS miniblock_total_snapshots,
	COALESCE(tmc.total_bytes, 0) AS miniblock_candidate_bytes,
	COALESCE(tmc.row_count, 0)  AS miniblock_candidate_count,
	COALESCE(tmc.snapshot_bytes, 0) AS candidate_snapshot_bytes,
	COALESCE(tmc.total_snapshots, 0)  AS candidate_total_snapshots,
	COALESCE(tmp.total_bytes, 0) AS minipool_bytes,
	COALESCE(tmp.row_count, 0)  AS minipool_count
FROM tmp_miniblocks tm
FULL OUTER JOIN tmp_miniblock_candidates tmc ON tm.stream_id = tmc.stream_id
FULL OUTER JOIN tmp_minipools tmp ON COALESCE(tm.stream_id, tmc.stream_id) = tmp.stream_id
{{stream_filter_clause}}
{{limit_clause}}
) AS sampled ORDER BY sampled.total_bytes DESC;
`

func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func printUsageReport(
	ctx context.Context,
	pool *pgxpool.Pool,
	info *dbInfo,
) (err error) {
	escapedSql := strings.ReplaceAll(generateReportSql, "{{schemaName}}", info.schema)

	formattedReportSql := viewReportSql
	if usageSampleSize > 0 {
		formattedReportSql = strings.ReplaceAll(
			formattedReportSql,
			"{{limit_clause}}",
			fmt.Sprintf(" ORDER BY RANDOM() LIMIT %d ", usageSampleSize),
		)
	} else {
		formattedReportSql = strings.ReplaceAll(formattedReportSql, "{{limit_clause}}", "")
	}

	if usageStreamType != "" {
		// Validate valid prefix
		if len(usageStreamType) != 2 {
			return fmt.Errorf("expect stream type to be a 2 character hex string with no '0x' prefix")
		}

		streamType, err := hex.DecodeString(usageStreamType)
		if err != nil {
			return fmt.Errorf("stream_type should be a hex string, but failed to parse as such: %w", err)
		}

		if _, err := shared.StreamIdContentLengthForType(streamType[0]); err != nil {
			return fmt.Errorf("invalid stream_type: %w", err)
		}

		formattedReportSql = strings.ReplaceAll(
			formattedReportSql,
			"{{stream_filter_clause}}",
			fmt.Sprintf("WHERE stream_id LIKE '%v%%'", usageStreamType),
		)
	} else {
		formattedReportSql = strings.ReplaceAll(formattedReportSql, "{{stream_filter_clause}}", "")
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("unable to create a pgx transaction: %w", err)
	}

	// Rollback and capture any additional errors on tx failure
	defer func() {
		if err != nil {
			if rollbackErr := tx.Rollback(ctx); rollbackErr != nil {
				err = fmt.Errorf("%w; Failed to roll back (%w)", err, rollbackErr)
			}
		}
	}()

	if _, err = tx.Exec(ctx, escapedSql); err != nil {
		return fmt.Errorf("error generating stream disk usage report for schema %v: %w", info.schema, err)
	}

	rows, err := tx.Query(ctx, formattedReportSql)
	if err != nil {
		return fmt.Errorf("error generating stream disk usage report: %w", err)
	}

	var (
		streamIdHex                     string
		totalBytes                      int64
		miniblockBytes                  int64
		miniblockCount                  int64
		miniblockSnapshotBytes          int64
		miniblockSnapshotCount          int64
		miniblockCandidateBytes         int64
		miniblockCandidateCount         int64
		miniblockCandidateSnapshotBytes int64
		miniblockCandidateSnapshotCount int64
		minipoolBytes                   int64
		minipoolCount                   int64
	)
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader(
		[]string{
			"Stream ID",
			"Total Bytes",
			"MB bytes",
			"# MBs",
			"MB snap bytes",
			"# MB snaps",
			"MB Cand Bytes",
			"# MBCs",
			"MBC Snap Bytes",
			"# MBC Snaps",
			"Minipool Bytes",
			"# MP Count",
		},
	)

	if _, err := pgx.ForEachRow(
		rows,
		[]any{
			&streamIdHex,
			&totalBytes,
			&miniblockBytes,
			&miniblockCount,
			&miniblockSnapshotBytes,
			&miniblockSnapshotCount,
			&miniblockCandidateBytes,
			&miniblockCandidateCount,
			&miniblockCandidateSnapshotBytes,
			&miniblockCandidateSnapshotCount,
			&minipoolBytes,
			&minipoolCount,
		},
		func() error {
			table.Append([]string{
				streamIdHex,
				formatBytes(totalBytes),
				formatBytes(miniblockBytes),
				fmt.Sprintf("%d", miniblockCount),
				formatBytes(miniblockSnapshotBytes),
				fmt.Sprintf("%d", miniblockSnapshotCount),
				formatBytes(miniblockCandidateBytes),
				fmt.Sprintf("%d", miniblockCandidateCount),
				formatBytes(miniblockCandidateSnapshotBytes),
				fmt.Sprintf("%d", miniblockCandidateSnapshotCount),
				formatBytes(minipoolBytes),
				fmt.Sprintf("%d", minipoolCount),
			})
			return nil
		},
	); err != nil {
		return fmt.Errorf("error scanning usage results: %w", err)
	}

	table.Render()

	return tx.Commit(ctx)
}

var usageCmd = &cobra.Command{
	Use:   "usage",
	Short: "Generate usage report for schema",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()

		pool, info, err := getDbPool(ctx, true)
		if err != nil {
			return err
		}

		return printUsageReport(ctx, pool, info)
	},
}

var (
	usageSampleSize int
	usageStreamType string
)

func init() {
	usageCmd.Flags().IntVarP(&usageSampleSize, "sample_size", "s", 0, "Sample size (0 for all streams)")
	usageCmd.Flags().
		StringVarP(&usageStreamType, "stream_type", "t", "", "Filter by stream type (e.g. 'a8' for user streams)")

	rootCmd.AddCommand(usageCmd)
}
