package dynmsgbuf

import (
	"errors"
	"sync"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

const (
	// maxBufferSize is the maximum buffer size.
	maxBufferSize = 2048

	// minBufferSize is the minimum buffer size.
	minBufferSize = 16
)

var (
	// ErrClosed is returned when the buffer is closed.
	ErrClosed = errors.New("buffer is closed")
)

// DynamicBuffer is a thread-safe, dynamically resizing message buffer.
type DynamicBuffer[T any] struct {
	mu         sync.Mutex
	buffer     []T
	signalChan chan struct{} // Signals when new items are added
}

// NewDynamicBuffer initializes a new dynamic buffer.
func NewDynamicBuffer[T any]() *DynamicBuffer[T] {
	return &DynamicBuffer[T]{
		buffer:     make([]T, 0),
		signalChan: make(chan struct{}, 1),
	}
}

// AddMessage adds a new item to the buffer.
func (db *DynamicBuffer[T]) AddMessage(item T) error {
	db.mu.Lock()
	if db.buffer == nil {
		db.mu.Unlock()
		return RiverError(Err_BUFFER_CLOSED, "Message buffer is closed").
			Func("DynamicBuffer.AddMessage")
	}

	if len(db.buffer) >= maxBufferSize {
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

// GetBatch retrieves up to `batchSize` messages, removing them from the buffer.
func (db *DynamicBuffer[T]) GetBatch(prev []T) []T {
	// Reset if capacity is unused
	if prev == nil || (cap(prev) > minBufferSize*2 && len(prev) < cap(prev)/2) {
		prev = make([]T, 0, minBufferSize)
	} else {
		// Deref pointers so they can be gc'ed faster
		var zero T
		for i := range prev {
			prev[i] = zero
		}
		prev = prev[:0]
	}

	db.mu.Lock()
	ret := db.buffer
	db.buffer = prev
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
	close(db.signalChan)
}
