package main

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"os"
	"sort"
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
			SampledStreamSizes             []int64
			MinSizeInSample                int64
			Q1SizeInSample                 int64
			MedianSizeInSample             int64
			Q3SizeInSample                 int64
			MaxSizeInSample                int64
			FormattedMinSize               string
			FormattedQ1Size                string
			FormattedMedianSize            string
			FormattedQ3Size                string
			FormattedMaxSize               string
		}
		var results []streamTypeStatsResults

		localRand := rand.New(rand.NewSource(time.Now().UnixNano()))

		// Percentile should be 0.0 to 1.0 (e.g., 0.25 for Q1, 0.5 for Median, 0.75 for Q3)
		calculatePercentile := func(sortedSizes []int64, percentile float64) int64 {
			n := len(sortedSizes)
			if n == 0 {
				return 0
			}
			if n == 1 {
				return sortedSizes[0] // Min, Median, Max are all the same for a single element
			}
			// Calculate index (0-based). For simplicity, we'll use a common method:
			// k = (n-1) * p. If k is integer, it's the index.
			// If not, some methods interpolate. We'll take the floor and use that element.
			// This is a simple approach; more complex methods exist for precise statistical percentiles.
			// For p=0.5 (median) and n is even, (n-1)*0.5 is x.5. int() truncates to x.
			// e.g. n=4, (3)*0.5 = 1.5, index = 1. sortedSizes[1] is chosen.
			// A common median for n=4 (indices 0,1,2,3) would be (sortedSizes[1]+sortedSizes[2])/2.
			// This method will pick sortedSizes[floor((n-1)*p)].
			index := int(float64(n-1) * percentile)
			if index < 0 {
				index = 0
			}
			if index >= n {
				index = n - 1
			}
			return sortedSizes[index]
		}

		for typeByte, typeName := range streamTypeMap {
			idsForType, ok := streamsByType[typeByte]
			currentTypeResult := streamTypeStatsResults{
				TypeName:                       typeName,
				SampledStreamSizes:             []int64{},
				FormattedAverageBytesPerStream: "N/A",
				FormattedMinSize:               "N/A",
				FormattedQ1Size:                "N/A",
				FormattedMedianSize:            "N/A",
				FormattedQ3Size:                "N/A",
				FormattedMaxSize:               "N/A",
			}

			if !ok || len(idsForType) == 0 {
				results = append(results, currentTypeResult)
				continue
			}

			localRand.Shuffle(len(idsForType), func(i, j int) {
				idsForType[i], idsForType[j] = idsForType[j], idsForType[i]
			})

			actualSampleSize := sampleSize
			if len(idsForType) < sampleSize {
				actualSampleSize = len(idsForType)
			}
			sample := idsForType[:actualSampleSize]
			currentTypeResult.SampledStreamCount = actualSampleSize

			var currentTypeTotalBytesAggregate int64 = 0
			for _, sID := range sample {
				partitionSuffix := storage.CreatePartitionSuffix(sID, numPartitions)
				tableName := fmt.Sprintf("miniblocks_%s", partitionSuffix)

				query := fmt.Sprintf(
					"SELECT COALESCE(SUM(octet_length(blockdata))::BIGINT, 0) FROM %s.%s WHERE stream_id = $1",
					info.schema,
					tableName,
				)

				var streamTotalBytes int64
				err := pool.QueryRow(ctx, query, sID.String()).Scan(&streamTotalBytes)
				if err != nil {
					fmt.Fprintf(
						os.Stderr,
						"Warning: failed to query size for stream %s in table %s.%s: %v. Assuming 0 bytes for this stream.\n",
						sID.String(),
						info.schema,
						tableName,
						err,
					)
					streamTotalBytes = 0
				}
				currentTypeResult.SampledStreamSizes = append(currentTypeResult.SampledStreamSizes, streamTotalBytes)
				currentTypeTotalBytesAggregate += streamTotalBytes
			}

			currentTypeResult.TotalBytesInSample = currentTypeTotalBytesAggregate
			if currentTypeResult.SampledStreamCount > 0 {
				currentTypeResult.RawAverageBytesInSample = currentTypeTotalBytesAggregate / int64(
					currentTypeResult.SampledStreamCount,
				)
				currentTypeResult.FormattedAverageBytesPerStream = formatBytes(
					currentTypeResult.RawAverageBytesInSample,
				)

				// Sort the collected sizes to calculate percentiles
				sort.Slice(currentTypeResult.SampledStreamSizes, func(i, j int) bool {
					return currentTypeResult.SampledStreamSizes[i] < currentTypeResult.SampledStreamSizes[j]
				})

				currentTypeResult.MinSizeInSample = currentTypeResult.SampledStreamSizes[0]
				currentTypeResult.FormattedMinSize = formatBytes(currentTypeResult.MinSizeInSample)

				currentTypeResult.MaxSizeInSample = currentTypeResult.SampledStreamSizes[currentTypeResult.SampledStreamCount-1]
				currentTypeResult.FormattedMaxSize = formatBytes(currentTypeResult.MaxSizeInSample)

				currentTypeResult.MedianSizeInSample = calculatePercentile(currentTypeResult.SampledStreamSizes, 0.5)
				currentTypeResult.FormattedMedianSize = formatBytes(currentTypeResult.MedianSizeInSample)

				currentTypeResult.Q1SizeInSample = calculatePercentile(currentTypeResult.SampledStreamSizes, 0.25)
				currentTypeResult.FormattedQ1Size = formatBytes(currentTypeResult.Q1SizeInSample)

				currentTypeResult.Q3SizeInSample = calculatePercentile(currentTypeResult.SampledStreamSizes, 0.75)
				currentTypeResult.FormattedQ3Size = formatBytes(currentTypeResult.Q3SizeInSample)
			} else if currentTypeTotalBytesAggregate > 0 {
				currentTypeResult.RawAverageBytesInSample = currentTypeTotalBytesAggregate
				currentTypeResult.FormattedAverageBytesPerStream = formatBytes(currentTypeTotalBytesAggregate)
			}
			results = append(results, currentTypeResult)
		}

		table := tablewriter.NewWriter(os.Stdout)
		table.SetHeader([]string{
			"Stream Type", "Streams Sampled",
			"Total MB Bytes (Sample)", "Avg Bytes/Stream (Sample)",
			"Min", "Q1", "Median", "Q3", "Max", // Added percentile headers
		})
		for _, r := range results {
			table.Append([]string{
				r.TypeName,
				fmt.Sprintf("%d", r.SampledStreamCount),
				formatBytes(r.TotalBytesInSample),
				r.FormattedAverageBytesPerStream,
				r.FormattedMinSize, // Added percentile data
				r.FormattedQ1Size,
				r.FormattedMedianSize,
				r.FormattedQ3Size,
				r.FormattedMaxSize,
			})
		}
		table.Render()

		// Optionally output individual sampled stream sizes
		if listIndividualSizes, _ := cmd.Flags().GetBool("list-sampled-sizes"); listIndividualSizes {
			fmt.Println("\n--- Individual Sampled Stream Sizes ---")
			for _, r := range results {
				if r.SampledStreamCount > 0 {
					fmt.Printf("\nStream Type: %s (%d streams sampled):\n", r.TypeName, r.SampledStreamCount)
					for i, size := range r.SampledStreamSizes {
						fmt.Printf("  Sample %d: %s\n", i+1, formatBytes(size))
					}
				} else {
					fmt.Printf("\nStream Type: %s (0 streams sampled)\n", r.TypeName)
				}
			}
			fmt.Println("\n--- End of Individual Sampled Stream Sizes ---")
		}

		if renderDetailedHistograms, _ := cmd.Flags().GetBool("render"); renderDetailedHistograms {
			numBucketsOpt, _ := cmd.Flags().GetInt("num-histogram-buckets")
			// Use a local variable for numBuckets, defaulting if the flag parsing somehow failed or returned <=0
			numHistBuckets := numBucketsOpt
			if numHistBuckets <= 0 {
				numHistBuckets = 10 // Default to 10 if flag is not set or invalid
			}
			const maxBarWidth = 40 // Keep this as a const for now, or make it a flag too if desired later

			for _, r := range results {
				if r.SampledStreamCount == 0 {
					continue
				}

				fmt.Printf("\nHistogram for Stream Type: %s (%d streams sampled)\n", r.TypeName, r.SampledStreamCount)

				minSize, maxSize := r.SampledStreamSizes[0], r.SampledStreamSizes[0]
				for _, size := range r.SampledStreamSizes {
					if size < minSize {
						minSize = size
					}
					if size > maxSize {
						maxSize = size
					}
				}

				histogramTable := tablewriter.NewWriter(os.Stdout)
				histogramTable.SetHeader([]string{"Size Range", "Count", "Histogram"})
				histogramTable.SetAlignment(tablewriter.ALIGN_LEFT)
				histogramTable.SetBorder(true)
				histogramTable.SetColumnSeparator("|")

				if minSize == maxSize {
					histogramTable.Append([]string{
						formatBytes(minSize),
						fmt.Sprintf("%d", r.SampledStreamCount),
						strings.Repeat("#", maxBarWidth), // Full bar as all are in this one bucket
					})
				} else {
					bucketWidth := (maxSize - minSize) / int64(numHistBuckets)
					if bucketWidth == 0 { // Avoid division by zero if maxSize-minSize < numHistBuckets but not all same
						bucketWidth = 1
					}

					bucketCounts := make([]int, numHistBuckets)
					for _, size := range r.SampledStreamSizes {
						bucketIndex := 0
						if bucketWidth > 0 {
							bucketIndex = int((size - minSize) / bucketWidth)
						}
						if bucketIndex >= numHistBuckets { // Ensure last bucket catches everything at maxSize
							bucketIndex = numHistBuckets - 1
						}
						bucketCounts[bucketIndex]++
					}

					maxBucketCount := 0
					for _, count := range bucketCounts {
						if count > maxBucketCount {
							maxBucketCount = count
						}
					}

					for i := 0; i < numHistBuckets; i++ {
						lowerBound := minSize + int64(i)*bucketWidth
						upperBound := lowerBound + bucketWidth - 1
						if i == numHistBuckets-1 {
							upperBound = maxSize
						}

						rangeStr := fmt.Sprintf("%s - %s", formatBytes(lowerBound), formatBytes(upperBound))
						count := bucketCounts[i]
						bar := ""
						if maxBucketCount > 0 && count > 0 {
							barLength := int((float64(count) / float64(maxBucketCount)) * float64(maxBarWidth))
							if barLength == 0 && count > 0 {
								barLength = 1
							}
							bar = strings.Repeat("#", barLength)
						}
						histogramTable.Append([]string{rangeStr, fmt.Sprintf("%d", count), bar})
					}
				}
				histogramTable.Render()
			}
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(usageCmd)
	histogramCmd.Flags().IntP("sample-size", "s", 100, "Number of streams to sample per type for histogram analysis")
	histogramCmd.Flags().BoolP("render", "H", false, "Render detailed histograms for each stream type")
	histogramCmd.Flags().
		BoolP("list-sampled-sizes", "L", false, "List the total size of each individually sampled stream, grouped by type")
	histogramCmd.Flags().IntP("num-histogram-buckets", "N", 10, "Number of buckets for the detailed histograms")
	rootCmd.AddCommand(histogramCmd)
}
