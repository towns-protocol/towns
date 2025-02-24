package registries

// StreamFlag is the stream flag type
type StreamFlag uint64

// Stream flags
const (
	// StreamFlagSealed is the flag for sealed stream
	StreamFlagSealed StreamFlag = 1 << iota
)
