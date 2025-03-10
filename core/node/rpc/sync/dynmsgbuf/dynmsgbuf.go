package dynmsgbuf

import (
	"errors"
	"sync"
	"sync/atomic"
)

const (
	// maxBufferSize
	maxBufferSize = 512
)

var (
	// ErrBufferFull is returned when the buffer is full.
	ErrBufferFull = errors.New("buffer is full")
)

// DynamicBuffer is a thread-safe, dynamically resizing message buffer.
type DynamicBuffer[T any] struct {
	mu         sync.Mutex
	buffer     []T
	signalChan chan struct{} // Signals when new items are added
	closed     int64
}

// NewDynamicBuffer initializes a new dynamic buffer.
func NewDynamicBuffer[T any]() *DynamicBuffer[T] {
	return &DynamicBuffer[T]{
		buffer:     make([]T, 0, maxBufferSize),
		signalChan: make(chan struct{}, 1),
	}
}

// AddMessage adds a new item to the buffer.
func (db *DynamicBuffer[T]) AddMessage(item T) error {
	if atomic.LoadInt64(&db.closed) == 1 {
		// TODO: Return error
		return nil
	}

	db.mu.Lock()
	defer db.mu.Unlock()

	if len(db.buffer) >= maxBufferSize {
		return ErrBufferFull
	}

	db.buffer = append(db.buffer, item)

	// Non-blocking signal (only if empty, avoids duplicate wake-ups)
	select {
	case db.signalChan <- struct{}{}:
	default:
	}

	return nil
}

// GetBatch retrieves up to `batchSize` messages, removing them from the buffer.
func (db *DynamicBuffer[T]) GetBatch(batchSize int) []T {
	db.mu.Lock()
	defer db.mu.Unlock()

	if len(db.buffer) == 0 {
		return nil
	}

	// Determine batch size (avoid slicing out of range)
	if batchSize > len(db.buffer) {
		batchSize = len(db.buffer)
	}

	// Copy batch & remove from buffer
	batch := make([]T, batchSize)
	copy(batch, db.buffer[:batchSize])
	db.buffer = db.buffer[batchSize:]

	return batch
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

// Close ...
func (db *DynamicBuffer[T]) Close() {
	atomic.StoreInt64(&db.closed, 1)
	close(db.signalChan)
}
