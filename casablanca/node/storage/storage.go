package storage

import (
	"casablanca/node/protocol"
	"context"
	"encoding/binary"
)

const (
	StorageTypePostgres = "postgres"
)

type StreamPos struct {
	StreamId   string
	SyncCookie []byte
}

type StreamEventsBlock struct {
	OriginalSyncCookie []byte
	SyncCookie         []byte
	Events             []*protocol.Envelope
}

type Storage interface {
	CreateStream(ctx context.Context, streamId string, inceptionEvents []*protocol.Envelope) ([]byte, error)
	GetStream(ctx context.Context, streamId string) (StreamPos, []*protocol.Envelope, error)
	// TODO return basic info about stream
	StreamExists(ctx context.Context, streamId string) (bool, error)
	AddEvent(ctx context.Context, streamId string, event *protocol.Envelope) ([]byte, error)
	SyncStreams(ctx context.Context, positions []*protocol.SyncPos, maxCount int, TimeoutMs uint32) (map[string]StreamEventsBlock, error)
}

func NewStorage(ctx context.Context, database_url string) (Storage, error) {
	return NewPGEventStore(ctx, database_url)
}

func SeqNumToBytes(seqNum int64) []byte {
	b := make([]byte, 8)
	binary.LittleEndian.PutUint64(b, uint64(seqNum))
	return b
}

func BytesToSeqNum(b []byte) int64 {
	return int64(binary.LittleEndian.Uint64(b))
}
