package storage

import (
	"casablanca/node/protocol"
	"context"
)

const (
	StorageTypePostgres = "postgres"
)

type StreamPos struct {
	StreamId   string
	SyncCookie int64
}

type StreamEventsBlock struct {
	OriginalSyncCookie []byte
	SyncCookie         []byte
	Events             []*protocol.Envelope
}

type Storage interface {
	CreateStream(ctx context.Context, streamId string, inceptionEvents []*protocol.Envelope) error
	GetStream(ctx context.Context, streamId string) ([]*protocol.Envelope, error)
	AddEvent(ctx context.Context, streamId string, event *protocol.Envelope) error
}

func NewStorage(ctx context.Context, database_url string) (Storage, error) {
	return NewPGEventStore(ctx, database_url, false)
}
