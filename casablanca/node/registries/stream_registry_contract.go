package registries

import "context"

type StreamRegistryContract interface {
	AllocateStream(ctx context.Context, streamId string, addresses []string, genesisMiniblockHash []byte) error
	GetStream(ctx context.Context, streamId string) ([]string, []byte, error)
	GetStreamsLength(ctx context.Context) (int64, error)
	GetStreamByIndex(ctx context.Context, index int64) (string, []string, []byte, error)
}
