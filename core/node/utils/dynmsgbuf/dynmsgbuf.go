package dynmsgbuf

import (
	"sync"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const (
	// MaxBufferSize is the default maximum buffer size.
	MaxBufferSize = 4096

	// MinBufferSize is the minimum buffer size.
	MinBufferSize = 16

	// UnboundedBuffer indicates the buffer has no size limit.
	UnboundedBuffer = -1
)

// DynamicBuffer is a thread-safe, dynamically resizing message buffer.
// It can be configured as bounded (with a maximum size) or unbounded.
type DynamicBuffer[T any] struct {
	mu         sync.Mutex
	buffer     []T
	maxSize    int           // -1 for unbounded, positive for bounded
	signalChan chan struct{} // Signals when new items are added
}

// NewDynamicBuffer initializes a new dynamic buffer with default max size.
func NewDynamicBuffer[T any]() *DynamicBuffer[T] {
	return NewDynamicBufferWithSize[T](MaxBufferSize)
}

// NewDynamicBufferWithSize initializes a new dynamic buffer with the given max size.
// Use UnboundedBuffer (-1) for an unbounded buffer.
func NewDynamicBufferWithSize[T any](maxSize int) *DynamicBuffer[T] {
	initialCap := MinBufferSize
	if maxSize > 0 && maxSize < MinBufferSize {
		initialCap = maxSize
	}

	return &DynamicBuffer[T]{
		buffer:     make([]T, 0, initialCap),
		maxSize:    maxSize,
		signalChan: make(chan struct{}, 1),
	}
}

// NewUnboundedDynamicBuffer creates a new unbounded dynamic buffer.
func NewUnboundedDynamicBuffer[T any]() *DynamicBuffer[T] {
	return NewDynamicBufferWithSize[T](UnboundedBuffer)
}

// AddMessage adds a new item to the buffer.
func (db *DynamicBuffer[T]) AddMessage(item T) error {
	db.mu.Lock()

	if db.buffer == nil {
		db.mu.Unlock()
		return RiverError(Err_UNAVAILABLE, "Message buffer is closed").
			Func("DynamicBuffer.AddMessage")
	}

	// Check size limit only for bounded buffers
	if db.maxSize > 0 && len(db.buffer) >= db.maxSize {
		db.mu.Unlock()
		return RiverError(Err_BUFFER_FULL, "Message buffer is full").
			Tags("maxSize", db.maxSize).
			Func("DynamicBuffer.AddMessage")
	}

	db.buffer = append(db.buffer, item)
	db.mu.Unlock()

	// Non-blocking signal (only if empty, avoids duplicate wake-ups)
	select {
	case db.signalChan <- struct{}{}:
	default:
	}

	return nil
}

// GetBatch returns a batch of messages from the buffer.
// Using a previous slice is optional, but can be used to reduce allocations.
// The caller is expected not to use prev anymore and only use the returned buffer after calling this function.
// Returns nil if the buffer is CLOSED.
func (db *DynamicBuffer[T]) GetBatch(prev []T) []T {
	// Reset if capacity is unused
	if prev == nil || (cap(prev) > MinBufferSize*2 && len(prev) < cap(prev)/2) {
		prev = make([]T, 0, MinBufferSize)
	} else {
		// Deref pointers so they can be gc'ed faster
		var zero T
		for i := range prev {
			prev[i] = zero
		}
		prev = prev[:0]
	}

	var ret []T

	db.mu.Lock()
	if db.buffer != nil {
		ret = db.buffer
		db.buffer = prev
	}
	db.mu.Unlock()

	return ret
}

// Len returns the number of messages in the buffer.
func (db *DynamicBuffer[T]) Len() int {
	db.mu.Lock()
	defer db.mu.Unlock()

	return len(db.buffer)
}

// Cap returns the current capacity of the buffer.
func (db *DynamicBuffer[T]) Cap() int {
	db.mu.Lock()
	defer db.mu.Unlock()

	if db.buffer == nil {
		return 0
	}
	return cap(db.buffer)
}

// MaxSize returns the maximum size of the buffer.
// Returns UnboundedBuffer (-1) for unbounded buffers.
func (db *DynamicBuffer[T]) MaxSize() int {
	return db.maxSize
}

// IsUnbounded returns true if the buffer has no size limit.
func (db *DynamicBuffer[T]) IsUnbounded() bool {
	return db.maxSize == UnboundedBuffer
}

// IsFull returns true if the buffer is at capacity.
// Always returns false for unbounded buffers.
func (db *DynamicBuffer[T]) IsFull() bool {
	if db.IsUnbounded() {
		return false
	}

	db.mu.Lock()
	defer db.mu.Unlock()

	return len(db.buffer) >= db.maxSize
}

// Wait blocks until new messages arrive.
func (db *DynamicBuffer[T]) Wait() <-chan struct{} {
	return db.signalChan
}

// Close closes the buffer.
func (db *DynamicBuffer[T]) Close() {
	db.mu.Lock()
	db.buffer = nil
	db.mu.Unlock()

	// Signal to any waiting goroutines that the buffer is closed
	select {
	case db.signalChan <- struct{}{}:
	default:
	}
}

// CloseAndGetBatch closes the buffer and returns the remaining items.
func (db *DynamicBuffer[T]) CloseAndGetBatch() []T {
	var batch []T

	db.mu.Lock()
	batch = db.buffer
	db.buffer = nil
	db.mu.Unlock()

	// Signal to any waiting goroutines that the buffer is closed
	select {
	case db.signalChan <- struct{}{}:
	default:
	}

	return batch
}

// IsClosed returns true if the buffer is closed.
func (db *DynamicBuffer[T]) IsClosed() bool {
	db.mu.Lock()
	defer db.mu.Unlock()

	return db.buffer == nil
}
