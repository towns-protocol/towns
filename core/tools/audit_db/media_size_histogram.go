package main

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/spf13/cobra"
)

// HistogramBin represents a single bin in the histogram
type HistogramBin struct {
	StartSize int64
	EndSize   int64
	Count     int
}

// BuildMediaSizeHistogram creates a histogram from a map of media IDs to sizes
func BuildMediaSizeHistogram(mediaSizes map[string]int64) []HistogramBin {
	if len(mediaSizes) == 0 {
		return nil
	}

	// Convert map to slice of sizes for easier processing
	sizes := make([]int64, 0, len(mediaSizes))
	for _, size := range mediaSizes {
		sizes = append(sizes, size)
	}
	sort.Slice(sizes, func(i, j int) bool { return sizes[i] < sizes[j] })

	// Calculate bin size based on data range
	minSize := sizes[0]
	maxSize := sizes[len(sizes)-1]

	// Use 30 bins by default, but adjust if we have fewer data points
	numBins := 30
	if len(sizes) < numBins {
		numBins = len(sizes)
	}

	// Calculate bin width
	binWidth := (maxSize - minSize) / int64(numBins)
	if binWidth == 0 {
		binWidth = 1 // Ensure we have at least 1 byte per bin
	}

	// Create bins
	bins := make([]HistogramBin, numBins)
	for i := 0; i < numBins; i++ {
		bins[i] = HistogramBin{
			StartSize: minSize + int64(i)*binWidth,
			EndSize:   minSize + int64(i+1)*binWidth,
			Count:     0,
		}
	}

	// Count sizes in each bin
	for _, size := range sizes {
		binIndex := (size - minSize) / binWidth
		if binIndex >= int64(numBins) {
			binIndex = int64(numBins - 1) // Handle edge case
		}
		bins[binIndex].Count++
	}

	return bins
}

// PrintHistogram prints the histogram in a readable format
func PrintHistogram(bins []HistogramBin) {
	fmt.Println("\nMedia Size Distribution:")
	fmt.Println("------------------------")

	// Find max count for scaling
	maxCount := 0
	for _, bin := range bins {
		if bin.Count > maxCount {
			maxCount = bin.Count
		}
	}

	// Print each bin
	for _, bin := range bins {
		// Calculate bar length (scale to 50 characters max)
		barLength := (bin.Count * 50) / maxCount
		if barLength == 0 && bin.Count > 0 {
			barLength = 1 // Ensure at least one character for non-zero counts
		}

		// Create bar
		bar := ""
		for i := 0; i < barLength; i++ {
			bar += "█"
		}

		// Print bin information
		fmt.Printf("%8d - %8d chunks: %3d files %s\n",
			bin.StartSize, bin.EndSize, bin.Count, bar)
	}
}

func mediaChunkSizeHistogram(ctx context.Context, pool *pgxpool.Pool) error {
	// 1. Get all media stream IDs
	mediaStreamSql := "SELECT stream_id FROM es WHERE stream_id LIKE 'ff%' LIMIT 1000"
	rows, err := pool.Query(ctx, mediaStreamSql)
	if err != nil {
		return fmt.Errorf("failed to query media streams: %w", err)
	}
	defer rows.Close()

	// 2. Group streams by their partition
	streamsByPartition := make(map[string][]string)
	var streamId string
	_, err = pgx.ForEachRow(rows, []any{&streamId}, func() error {
		partition := getPartitionSuffix(streamId)
		streamsByPartition[partition] = append(streamsByPartition[partition], streamId)
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to collect stream IDs: %w", err)
	}

	// 3. Process each partition in parallel
	var mu sync.Mutex
	streamsMap := make(map[string]int64)
	errChan := make(chan error, len(streamsByPartition))
	var wg sync.WaitGroup

	for partition, partitionStreams := range streamsByPartition {
		wg.Add(1)
		go func(partition string, streams []string) {
			defer wg.Done()

			// Build IN clause for the streams in this partition
			placeholders := make([]string, len(streams))
			args := make([]interface{}, len(streams))
			for i, stream := range streams {
				placeholders[i] = fmt.Sprintf("$%d", i+1)
				args[i] = stream
			}

			// Modified query to count chunks per stream
			sql := escapeSql(
				fmt.Sprintf("SELECT stream_id, COUNT(*) as chunk_count FROM {{miniblocks}} WHERE seq_num > 0 AND stream_id IN (%s) GROUP BY stream_id",
					strings.Join(placeholders, ",")),
				partition,
			)

			rows, err := pool.Query(ctx, sql, args...)
			if err != nil {
				errChan <- fmt.Errorf("failed to query partition %s: %w", partition, err)
				return
			}
			defer rows.Close()

			var streamId string
			var chunkCount int64
			partitionStreams := make(map[string]int64)

			_, err = pgx.ForEachRow(rows, []any{&streamId, &chunkCount}, func() error {
				partitionStreams[streamId] = chunkCount
				return nil
			})

			if err != nil {
				errChan <- fmt.Errorf("error processing miniblocks for partition %s: %w", partition, err)
				return
			}

			// Safely merge results
			mu.Lock()
			for stream, count := range partitionStreams {
				streamsMap[stream] = count
			}
			mu.Unlock()
		}(partition, partitionStreams)
	}

	// Wait for all goroutines to complete
	wg.Wait()
	close(errChan)

	// Check for any errors
	for err := range errChan {
		if err != nil {
			return err
		}
	}

	// Build histogram of chunk counts
	histogram := BuildMediaSizeHistogram(streamsMap)
	PrintHistogram(histogram)

	return nil
}

var (
	mediaChunkSizeHistogramCmd = &cobra.Command{
		Use:   "media-chunk-size-histogram",
		Short: "Generate a histogram of media chunk sizes",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			pool, _, err := getDbPool(ctx, true)
			if err != nil {
				return err
			}

			return mediaChunkSizeHistogram(ctx, pool)
		},
	}
)

func init() {
	rootCmd.AddCommand(mediaChunkSizeHistogramCmd)
}
