package dynmsgbuf

import (
	"sync"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const (
	// MaxBufferSize is the maximum buffer size.
	MaxBufferSize = 4096

	// MinBufferSize is the minimum buffer size.
	MinBufferSize = 16
)

// DynamicBuffer is a thread-safe, dynamically resizing message buffer.
type DynamicBuffer[T any] struct {
	mu         sync.Mutex
	buffer     []T
	maxSize    int
	signalChan chan struct{} // Signals when new items are added
}

// NewDynamicBuffer initializes a new dynamic buffer.
func NewDynamicBuffer[T any]() *DynamicBuffer[T] {
	return NewDynamicBufferWithSize[T](MaxBufferSize)
}

// NewDynamicBufferWithSize initializes a new dynamic buffer with the given max size.
func NewDynamicBufferWithSize[T any](maxSize int) *DynamicBuffer[T] {
	return &DynamicBuffer[T]{
		buffer:     make([]T, 0, MinBufferSize),
		maxSize:    maxSize,
		signalChan: make(chan struct{}, 1),
	}
}

// AddMessage adds a new item to the buffer.
func (db *DynamicBuffer[T]) AddMessage(item T) error {
	db.mu.Lock()

	if db.buffer == nil {
		db.mu.Unlock()
		return RiverError(Err_UNAVAILABLE, "Message buffer is closed").
			Func("DynamicBuffer.AddMessage")
	}

	if len(db.buffer) >= MaxBufferSize {
		db.mu.Unlock()
		return RiverError(Err_BUFFER_FULL, "Message buffer is full").
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
