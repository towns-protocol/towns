package main

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/olekukonko/tablewriter"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
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
ORDER BY total_bytes DESC;
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

	rows, err := tx.Query(ctx, viewReportSql)
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

var histogramCmd = &cobra.Command{
	Use:   "histogram",
	Short: "Generate a histogram of disk usage by stream type based on a random sample of streams.",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		sampleSize, _ := cmd.Flags().GetInt("sample-size")

		pool, info, err := getDbPool(ctx, true)
		if err != nil {
			return fmt.Errorf("failed to get db pool: %w", err)
		}

		var numPartitions int
		err = pool.QueryRow(ctx, "SELECT num_partitions FROM settings WHERE single_row_key=true").Scan(&numPartitions)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				// Fallback or warning if num_partitions not found, though it should exist.
				fmt.Fprintln(
					os.Stderr,
					"Warning: num_partitions not found in settings table, defaulting to 256. Report may be inaccurate.",
				)
				numPartitions = 256
			} else {
				return fmt.Errorf("failed to query num_partitions from settings: %w", err)
			}
		}

		esRows, err := pool.Query(ctx, "SELECT stream_id FROM es")
		if err != nil {
			return fmt.Errorf("failed to query stream_ids from es table: %w", err)
		}
		defer esRows.Close()

		allStreamIdStrings := []string{}
		for esRows.Next() {
			var idStr string
			if err := esRows.Scan(&idStr); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to scan stream_id: %v\n", err)
				continue
			}
			allStreamIdStrings = append(allStreamIdStrings, idStr)
		}
		if err := esRows.Err(); err != nil {
			return fmt.Errorf("error iterating over stream_ids from es table: %w", err)
		}

		streamTypeMap := map[byte]string{
			shared.STREAM_CHANNEL_BIN:           shared.StreamTypeToString(shared.STREAM_CHANNEL_BIN),
			shared.STREAM_DM_CHANNEL_BIN:        shared.StreamTypeToString(shared.STREAM_DM_CHANNEL_BIN),
			shared.STREAM_GDM_CHANNEL_BIN:       shared.StreamTypeToString(shared.STREAM_GDM_CHANNEL_BIN),
			shared.STREAM_MEDIA_BIN:             shared.StreamTypeToString(shared.STREAM_MEDIA_BIN),
			shared.STREAM_SPACE_BIN:             shared.StreamTypeToString(shared.STREAM_SPACE_BIN),
			shared.STREAM_USER_METADATA_KEY_BIN: shared.StreamTypeToString(shared.STREAM_USER_METADATA_KEY_BIN),
			shared.STREAM_USER_INBOX_BIN:        shared.StreamTypeToString(shared.STREAM_USER_INBOX_BIN),
			shared.STREAM_USER_BIN:              shared.StreamTypeToString(shared.STREAM_USER_BIN),
			shared.STREAM_USER_SETTINGS_BIN:     shared.StreamTypeToString(shared.STREAM_USER_SETTINGS_BIN),
		}

		streamsByType := make(map[byte][]shared.StreamId)
		for _, idStr := range allStreamIdStrings {
			streamIdObj, err := shared.StreamIdFromString(idStr)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to parse stream_id '%s': %v\n", idStr, err)
				continue
			}
			streamsByType[streamIdObj.Type()] = append(streamsByType[streamIdObj.Type()], streamIdObj)
		}

		type streamTypeStatsResults struct {
			TypeName                       string
			SampledStreamCount             int
			TotalBytesInSample             int64
			RawAverageBytesInSample        int64
			FormattedAverageBytesPerStream string
		}
		var results []streamTypeStatsResults

		localRand := rand.New(rand.NewSource(time.Now().UnixNano()))

		for typeByte, typeName := range streamTypeMap {
			idsForType, ok := streamsByType[typeByte]
			if !ok || len(idsForType) == 0 {
				results = append(results, streamTypeStatsResults{
					TypeName:                       typeName,
					SampledStreamCount:             0,
					TotalBytesInSample:             0,
					RawAverageBytesInSample:        0,
					FormattedAverageBytesPerStream: "N/A",
				})
				continue
			}

			// Use the localized random source
			localRand.Shuffle(len(idsForType), func(i, j int) {
				idsForType[i], idsForType[j] = idsForType[j], idsForType[i]
			})

			actualSampleSize := sampleSize
			if len(idsForType) < sampleSize {
				actualSampleSize = len(idsForType)
			}
			sample := idsForType[:actualSampleSize]

			var currentTypeTotalBytes int64 = 0
			for _, sID := range sample {
				partitionSuffix := storage.CreatePartitionSuffix(sID, numPartitions)
				tableName := fmt.Sprintf("miniblocks_%s", partitionSuffix)

				// Ensure schema name is quoted if it contains special characters, though typically it won't for this tool's use cases.
				// pgx handles quoting for table names if Identifier is used, but here we build it into the query string.
				// Direct concatenation is generally safe if info.schema and tableName are controlled, which they are here.
				query := fmt.Sprintf(
					"SELECT COALESCE(SUM(octet_length(blockdata))::BIGINT, 0) FROM %s.%s WHERE stream_id = $1",
					info.schema, // info.schema should be safe as it's derived from DB connection params or defaults
					tableName,   // tableName is constructed from controlled inputs
				)

				var streamTotalBytes int64
				err := pool.QueryRow(ctx, query, sID.String()).Scan(&streamTotalBytes)
				if err != nil {
					// Log error but continue. This can happen if a stream_id is in the 'es' table
					// but has not had any miniblocks written to its partition table yet, or if there's
					// a schema issue (though less likely for a simple size query).
					fmt.Fprintf(
						os.Stderr,
						"Warning: failed to query size for stream %s in table %s.%s: %v. Assuming 0 bytes for this stream.\n",
						sID.String(),
						info.schema,
						tableName,
						err,
					)
					// Treat as 0 bytes for this stream in the sample if query fails
					streamTotalBytes = 0
				}
				currentTypeTotalBytes += streamTotalBytes
			}

			avgBytesStr := "N/A"
			var rawAvgBytes int64 = 0
			if actualSampleSize > 0 {
				rawAvgBytes = currentTypeTotalBytes / int64(actualSampleSize)
				avgBytesStr = formatBytes(rawAvgBytes)
			} else if currentTypeTotalBytes > 0 {
				// This case (total bytes > 0 but sample size = 0) should ideally not be hit if logic is correct
				// but if it is, treat average as total for a single effective item.
				rawAvgBytes = currentTypeTotalBytes
				avgBytesStr = formatBytes(currentTypeTotalBytes)
			}

			results = append(results, streamTypeStatsResults{
				TypeName:                       typeName,
				SampledStreamCount:             actualSampleSize,
				TotalBytesInSample:             currentTypeTotalBytes,
				RawAverageBytesInSample:        rawAvgBytes,
				FormattedAverageBytesPerStream: avgBytesStr,
			})
		}

		table := tablewriter.NewWriter(os.Stdout)
		table.SetHeader(
			[]string{"Stream Type", "Streams Sampled", "Total MB Bytes (Sample)", "Avg Bytes/Stream (Sample)"},
		)
		for _, r := range results {
			table.Append([]string{
				r.TypeName,
				fmt.Sprintf("%d", r.SampledStreamCount),
				formatBytes(r.TotalBytesInSample),
				r.FormattedAverageBytesPerStream,
			})
		}
		table.Render()

		// Optionally render text histogram
		if renderHistogram, _ := cmd.Flags().GetBool("render"); renderHistogram {
			fmt.Println("\nText Histogram of Average Miniblock Size per Stream (Sampled):")

			var maxRawAvgBytes int64 = 0
			for _, r := range results {
				if r.RawAverageBytesInSample > maxRawAvgBytes {
					maxRawAvgBytes = r.RawAverageBytesInSample
				}
			}

			const maxBarWidth = 50
			histogramTable := tablewriter.NewWriter(os.Stdout)
			histogramTable.SetHeader([]string{"Stream Type", "Histogram", "Avg Size"})
			histogramTable.SetAlignment(tablewriter.ALIGN_LEFT)
			// No borders for a cleaner histogram look, or keep them if preferred.
			histogramTable.SetBorder(false)
			histogramTable.SetColumnSeparator("|")

			for _, r := range results {
				bar := "N/A"
				if r.SampledStreamCount > 0 && maxRawAvgBytes > 0 {
					barLength := int(
						(float64(r.RawAverageBytesInSample) / float64(maxRawAvgBytes)) * float64(maxBarWidth),
					)
					if barLength < 0 {
						barLength = 0
					} // Ensure non-negative
					bar = strings.Repeat("#", barLength)
				} else if r.SampledStreamCount > 0 && r.RawAverageBytesInSample == 0 {
					bar = "(empty)" // Indicates sampled, but size is zero
				}
				histogramTable.Append([]string{r.TypeName, bar, r.FormattedAverageBytesPerStream})
			}
			histogramTable.Render()
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(usageCmd)
	histogramCmd.Flags().IntP("sample-size", "s", 100, "Number of streams to sample per type for histogram analysis")
	histogramCmd.Flags().BoolP("render", "H", false, "Render a text-based histogram of average sizes")
	rootCmd.AddCommand(histogramCmd)
}
