package storage

import "context"

type ErrNotFound struct {
	StreamId string
}

type GetStreamFromLastSnapshotResult struct {
	StartMiniblockNumber int64
	Miniblocks           [][]byte
	MinipoolEnvelopes    [][]byte
}

type StreamStorage interface {
	// CreateStream creates a new stream with the given genesis miniblock at index 0.
	// Last snapshot minblock index is set to 0.
	// Minipool is set to generation number 1 (i.e. number of miniblock that is going to be produced next) and is empty.
	CreateStream(ctx context.Context, streamId string, genesisMiniblock []byte) error

	// Returns all stream blocks starting from last snapshot miniblock index and all envelopes in the given minipool.
	GetStreamFromLastSnapshot(ctx context.Context, streamId string, precedingBlockCount int) (*GetStreamFromLastSnapshotResult, error)

	// Returns miniblocks with miniblockNum or "generation" from fromInclusive, to toExlusive.
	GetMiniblocks(ctx context.Context, streamId string, fromInclusive int64, toExclusive int64) ([][]byte, error)

	// Adds event to the given minipool.
	// Current generation of minipool should match minipoolGeneration,
	// and there should be exactly minipoolSlot events in the minipool.
	AddEvent(ctx context.Context, streamId string, minipoolGeneration int64, minipoolSlot int, envelope []byte) error

	// Current minipool generation must be minipoolGeneration and size must be minipoolSize,
	// stream must have minipoolGeneration miniblocks.
	// Deletes current minipool at minipoolGeneration,
	// creates new minipool at minipoolGeneration + 1,
	// stores provided miniblock at minipoolGeneration index,
	// if snapshotMiniblock is true, stores minipoolGeneration as last snapshot miniblock index,
	// stores envelopes in the new minipool in slots starting with 0.
	CreateBlock(
		ctx context.Context,
		streamId string,
		minipoolGeneration int64,
		minipoolSize int,
		miniblock []byte,
		snapshotMiniblock bool,
		envelopes [][]byte,
	) error
}

func (m *ErrNotFound) Error() string {
	return "stream not found: " + m.StreamId
}
