package crypto

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/river-build/river/core/node/base/test"
	"github.com/stretchr/testify/require"
)

func TestMonitorWithoutWebsockets(t *testing.T) {
	require := require.New(t)

	ctx := test.NewTestContext()

	_, backend, err := initSimulated(ctx, 1)
	var backendMu sync.Mutex
	require.NoError(err)
	defer func() {
		backendMu.Lock()
		defer backendMu.Unlock()
		backend.Close()
		backend = nil
	}()
	client := backend.Client()

	bn, err := client.BlockNumber(ctx)
	require.NoError(err)
	initialBlockNum := BlockNumber(bn)
	fmt.Println("Blocknumber before test: ", bn)

	blockTime := 20 * time.Millisecond
	go func() {
		for {
			if ctx.Err() != nil {
				return
			}
			time.Sleep(blockTime)
			if ctx.Err() != nil {
				return
			}

			backendMu.Lock()
			if backend == nil {
				backendMu.Unlock()
				return
			}
			fmt.Println("About to commit block")
			backend.Commit()
			b, e := client.BlockNumber(ctx)
			fmt.Println("Committed block, blocknumber:", b, e)
			backendMu.Unlock()
		}
	}()

	bm, err := NewBlockMonitor(ctx, client, initialBlockNum, blockTime)
	require.NoError(err)
	defer func() {
		if bm != nil {
			bm.Close()
		}
	}()

	ch := MakeBlockNumberChannel()
	err = bm.AddListener(ch, initialBlockNum)
	require.NoError(err)

	prevBN := initialBlockNum
	for i := 0; i < 10; i++ {
		bn, ok := <-ch
		fmt.Println("Blocknumber: ", bn, ok)
		require.True(ok)
		require.Greater(bn, prevBN)
		prevBN = bn
	}

	bm.Close()
	bm = nil

	for i := 0; i < 10; i++ {
		bn, ok := <-ch
		fmt.Println("Blocknumber: ", bn, ok)
		if !ok {
			return
		}
		require.Greater(bn, prevBN)
		prevBN = bn
	}
	t.Fatal("Expected channel to be closed")
}
