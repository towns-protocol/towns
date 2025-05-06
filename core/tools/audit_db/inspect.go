package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/olekukonko/tablewriter"
	"github.com/spf13/cobra"

	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

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

var listStreamsCmd = &cobra.Command{
	Use:   "streams",
	Short: "List database streams",
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()
		pool, _, err := getDbPool(ctx, true)
		if err != nil {
			return err
		}

		streamIds, _, _, err := getStreamIds(ctx, pool)
		if err != nil {
			fmt.Println("Error reading stream ids:", err)
			os.Exit(1)
		}

		table := tablewriter.NewWriter(os.Stdout)
		table.SetHeader(
			[]string{
				"Stream ID",
			},
		)
		for _, id := range streamIds {
			table.Append([]string{id})
		}
		table.Render()
		return nil
	},
}

func getPartitionSuffix(streamId string) string {
	sharedStreamId, err := shared.StreamIdFromString(streamId)
	if err != nil {
		fmt.Println("Bad stream id: ", streamId)
		os.Exit(1)
	}
	return fmt.Sprintf("_%v", storage.CreatePartitionSuffix(sharedStreamId, 256))
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

	suffix := getPartitionSuffix(streamId)
	rows, err := pool.Query(
		ctx,
		escapeSql(
			`SELECT stream_id, seq_num, blockdata from {{miniblocks}}
			WHERE stream_id = $1 order by seq_num `,
			suffix,
		),
		streamId,
	)
	if err != nil {
		fmt.Println("Error reading stream miniblocks:", err)
		os.Exit(1)
	}

	fmt.Println("Miniblocks (seq_num, blockdata)")
	fmt.Println("==========================================")
	for rows.Next() {
		var id string
		var seqNum int64
		var blockData []byte
		if err := rows.Scan(&id, &seqNum, &blockData); err != nil {
			fmt.Println("Error scanning miniblock row:", err)
			os.Exit(1)
		}
		fmt.Printf("%v %v\n", seqNum, hex.EncodeToString(blockData))
	}
	fmt.Println()

	rows, err = pool.Query(
		ctx,
		escapeSql(
			`SELECT stream_id, seq_num, block_hash, blockdata from {{miniblock_candidates}}
			WHERE stream_id = $1 order by seq_num, block_hash`,
			suffix,
		),
		streamId,
	)
	if err != nil {
		fmt.Println("Error reading stream miniblock candidates :", err)
	} else {
		fmt.Println("Miniblock Candidates (seq_num, block_hash, block_data)")
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
			fmt.Printf("%v %v %v\n", seqNum, hashStr, hex.EncodeToString(blockData))
		}
		fmt.Println()
	}

	rows, err = pool.Query(
		ctx,
		escapeSql(
			`SELECT stream_id, generation, slot_num, envelope from {{minipools}}
			WHERE stream_id = $1 order by generation, slot_num`,
			suffix,
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
		envelopeString := hex.EncodeToString(envelope)
		if envelopeString == "" {
			envelopeString = "<empty>"
		}
		fmt.Printf("%v %v %v\n", generation, slotNum, envelopeString)
	}
	fmt.Println()

	return nil
}

var inspectCmd = &cobra.Command{
	Use:   "inspect",
	Short: "Inspect stream data on database",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx := cmd.Context()

		// Valid stream id?
		streamId, err := shared.StreamIdFromString(args[0])
		if err != nil {
			return fmt.Errorf("could not parse streamId: %w", err)
		}

		pool, _, err := getDbPool(ctx, true)
		if err != nil {
			return wrapError("Failed to initialize target database pool", err)
		}

		return inspectStream(ctx, pool, streamId.String())
	},
}

func init() {
	listCmd.AddCommand(listStreamsCmd)
	rootCmd.AddCommand(inspectCmd)
}
