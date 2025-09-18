package dynmsgbuf_test

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

func TestDynamicBuffer_AddMessage(t *testing.T) {
	db := dynmsgbuf.NewDynamicBuffer[int]()
	err := db.AddMessage(42)
	assert.NoError(t, err)
	assert.Equal(t, 1, db.Len())
}

func TestDynamicBuffer_AddMessage_Overflow(t *testing.T) {
	db := dynmsgbuf.NewDynamicBuffer[int]()
	for i := 0; i < dynmsgbuf.MaxBufferSize; i++ {
		require.NoError(t, db.AddMessage(i))
	}
	err := db.AddMessage(100)
	assert.Error(t, err)
}

func TestDynamicBuffer_GetBatch(t *testing.T) {
	db := dynmsgbuf.NewDynamicBuffer[int]()
	require.NoError(t, db.AddMessage(1))
	require.NoError(t, db.AddMessage(2))
	require.NoError(t, db.AddMessage(3))

	batch := db.GetBatch(nil)
	assert.Equal(t, []int{1, 2, 3}, batch)
	assert.Equal(t, 0, db.Len())
}

func TestDynamicBuffer_Wait(t *testing.T) {
	db := dynmsgbuf.NewDynamicBuffer[int]()

	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		defer wg.Done()
		<-db.Wait()
	}()

	time.Sleep(50 * time.Millisecond) // Ensure goroutine is waiting
	require.NoError(t, db.AddMessage(42))

	wg.Wait() // Ensure Wait() was triggered
}

func TestDynamicBuffer_Close(t *testing.T) {
	db := dynmsgbuf.NewDynamicBuffer[int]()
	require.NoError(t, db.AddMessage(1))
	db.Close()

	err := db.AddMessage(2)
	assert.Error(t, err)
	assert.True(t, db.IsClosed())
}

func TestDynamicBuffer_UnboundedBuffer(t *testing.T) {
	db := dynmsgbuf.NewUnboundedDynamicBuffer[int]()

	assert.True(t, db.IsUnbounded())
	assert.Equal(t, dynmsgbuf.UnboundedBuffer, db.MaxSize())
	assert.False(t, db.IsFull())

	// Add more than MaxBufferSize items
	for i := 0; i < dynmsgbuf.MaxBufferSize+100; i++ {
		require.NoError(t, db.AddMessage(i))
	}

	assert.Equal(t, dynmsgbuf.MaxBufferSize+100, db.Len())
	assert.False(t, db.IsFull()) // Still not full

	// Verify all items are retrieved
	batch := db.GetBatch(nil)
	assert.Equal(t, dynmsgbuf.MaxBufferSize+100, len(batch))
	for i := 0; i < len(batch); i++ {
		assert.Equal(t, i, batch[i])
	}
}

func TestDynamicBuffer_BoundedWithCustomSize(t *testing.T) {
	customSize := 10
	db := dynmsgbuf.NewDynamicBufferWithSize[string](customSize)

	assert.False(t, db.IsUnbounded())
	assert.Equal(t, customSize, db.MaxSize())

	// Fill to capacity
	for i := 0; i < customSize; i++ {
		require.NoError(t, db.AddMessage("msg"))
	}

	assert.True(t, db.IsFull())

	// Attempt to add beyond capacity
	err := db.AddMessage("overflow")
	assert.Error(t, err)
}

func TestDynamicBuffer_CapacityAndLen(t *testing.T) {
	db := dynmsgbuf.NewDynamicBuffer[float64]()

	assert.Equal(t, 0, db.Len())
	assert.GreaterOrEqual(t, db.Cap(), dynmsgbuf.MinBufferSize)

	// Add some items
	for i := 0; i < 5; i++ {
		require.NoError(t, db.AddMessage(float64(i)))
	}

	assert.Equal(t, 5, db.Len())

	// Close and check capacity
	db.Close()
	assert.Equal(t, 0, db.Cap())
}

func TestDynamicBuffer_ConcurrentAccessUnbounded(t *testing.T) {
	db := dynmsgbuf.NewUnboundedDynamicBuffer[int]()
	numGoroutines := 10
	itemsPerGoroutine := 1000

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	// Multiple writers
	for g := 0; g < numGoroutines; g++ {
		go func(goroutineID int) {
			defer wg.Done()
			for i := 0; i < itemsPerGoroutine; i++ {
				err := db.AddMessage(goroutineID*itemsPerGoroutine + i)
				require.NoError(t, err)
			}
		}(g)
	}

	wg.Wait()

	// Verify all items were added
	assert.Equal(t, numGoroutines*itemsPerGoroutine, db.Len())

	// Get all items
	batch := db.GetBatch(nil)
	assert.Equal(t, numGoroutines*itemsPerGoroutine, len(batch))
}
