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
}
