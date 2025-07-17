package events_test

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func TestQuorumPool(t *testing.T) {
	t.Parallel()

	t.Run("Success", func(t *testing.T) {
		t.Parallel()
		quorumPoolSuccess(t)
	})

	t.Run("Fail", func(t *testing.T) {
		t.Parallel()
		quorumPoolFail(t)
	})

	t.Run("QuorumWithSomeRemoteTimeouts", func(t *testing.T) {
		t.Parallel()
		quorumPoolWithSomeSlowRemotes(t)
	})

	t.Run("QuorumFailureDueToRemoteTimeouts", func(t *testing.T) {
		t.Parallel()
		quorumPoolWithTooManySlowRemotes(t)
	})

	t.Run("QuorumExternalCheckFail", func(t *testing.T) {
		t.Parallel()
		quorumPoolWithExternalCheckFail(t)
	})

	t.Run("QuorumExternalCheckSuccess", func(t *testing.T) {
		t.Parallel()
		quorumPoolWithExternalCheckSuccess(t)
	})

	t.Run("ReadModeAllSuccess", func(t *testing.T) {
		t.Parallel()
		quorumPoolReadModeAllSuccess(t)
	})

	t.Run("WriteModeQuorumSuccess", func(t *testing.T) {
		t.Parallel()
		quorumPoolWriteModeQuorumSuccess(t)
	})
}

func quorumPoolSuccess(t *testing.T) {
	ctx := test.NewTestContext(t)

	var (
		req     = require.New(t)
		remotes = []common.Address{{1}, {2}, {3}, {4}}
		qPool   = events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().WriteMode())
		wg      sync.WaitGroup
	)

	wg.Add(1 + len(remotes))

	qPool.AddTask(func(ctx context.Context) error {
		defer wg.Done()

		time.Sleep(time.Duration(rand.Int()%500) * time.Millisecond)
		return nil
	})

	qPool.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
		defer wg.Done()

		time.Sleep(time.Duration(rand.Int()%500) * time.Millisecond)
		if node[0]%2 == 0 {
			return fmt.Errorf("node %s returned error", node)
		}

		return nil
	})

	req.NoError(qPool.Wait(), "quorum must be reached")

	wg.Wait() // make goleak happy
}

func quorumPoolFail(t *testing.T) {
	ctx := test.NewTestContext(t)

	var (
		req     = require.New(t)
		remotes = []common.Address{{1}, {2}, {3}, {4}}
		qPool   = events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().WriteMode())
		wg      sync.WaitGroup
	)

	wg.Add(1 + len(remotes))

	qPool.AddTask(func(ctx context.Context) error {
		defer wg.Done()

		time.Sleep(time.Duration(rand.Int()%500) * time.Millisecond)

		return fmt.Errorf("local node returned error")
	})

	qPool.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
		defer wg.Done()

		time.Sleep(time.Duration(rand.Int()%500) * time.Millisecond)

		if node[0]%2 == 1 {
			return fmt.Errorf("node %s returned error", node)
		}

		return nil
	})

	req.Error(qPool.Wait(), "quorum must not be reached")

	wg.Wait() // make goleak happy
}

// quorumPoolWithSomeSlowRemotes ensures that quorum is reached even when some remotes timeout before responding
func quorumPoolWithSomeSlowRemotes(t *testing.T) {
	ctx := test.NewTestContext(t)

	var (
		req     = require.New(t)
		remotes = []common.Address{{1}, {2}, {3}, {4}}
		qPool   = events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().WriteModeWithTimeout(time.Second))
		wg      sync.WaitGroup
	)

	wg.Add(1 + len(remotes))

	qPool.AddTask(func(ctx context.Context) error {
		defer wg.Done()

		select {
		case <-time.After(10 * time.Millisecond):
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	})

	qPool.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
		defer wg.Done()

		duration := time.Duration(100 * time.Millisecond)
		if node[0] <= byte(len(remotes)/2) { // some nodes are really slow
			duration = time.Duration(5 * time.Second)
		}

		// simulate that some remotes timeout
		select {
		case <-time.After(duration):
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	})

	req.NoError(qPool.Wait())

	wg.Wait() // make goleak happy
}

// quorumPoolWithTooManySlowRemotes ensures that quorum isn't reached when too many remotes timeout before responding
// preventing reaching quorum withing timeout.
func quorumPoolWithTooManySlowRemotes(t *testing.T) {
	ctx := test.NewTestContext(t)

	var (
		req     = require.New(t)
		remotes = []common.Address{{1}, {2}, {3}, {4}}
		qPool   = events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().WriteModeWithTimeout(time.Second))
		wg      sync.WaitGroup
	)

	wg.Add(1 + len(remotes))

	qPool.AddTask(func(ctx context.Context) error {
		defer wg.Done()

		select {
		case <-time.After(10 * time.Millisecond):
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	})

	qPool.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
		defer wg.Done()

		duration := time.Duration(10 * time.Millisecond)
		if node[0] <= byte(1+len(remotes)/2) { // some nodes are too slow
			duration = time.Duration(5 * time.Second)
		}

		// simulate that some remotes timeout
		select {
		case <-time.After(duration):
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	})

	var (
		err    *RiverErrorImpl
		target = RiverError(Err_QUORUM_FAILED, "quorum failed")
	)

	req.ErrorAs(qPool.Wait(), &err)
	req.ErrorIs(err, target)

	wg.Wait() // make goleak happy
}

func quorumPoolWithExternalCheckFail(t *testing.T) {
	ctx := test.NewTestContext(t)

	var (
		req     = require.New(t)
		remotes = []common.Address{{1}, {2}, {3}, {4}}
		check   = func() bool { return false }
		qPool   = events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().WriteMode().WithExternalQuorumCheck(check))
		wg      sync.WaitGroup
	)

	wg.Add(1 + len(remotes))

	qPool.AddTask(func(ctx context.Context) error {
		defer wg.Done()
		return nil
	})

	qPool.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
		defer wg.Done()
		return nil
	})

	var (
		err    *RiverErrorImpl
		target = RiverError(Err_QUORUM_FAILED, "quorum failed")
	)

	req.ErrorAs(qPool.Wait(), &err)
	req.ErrorIs(err, target)

	wg.Wait() // make goleak happy
}

func quorumPoolWithExternalCheckSuccess(t *testing.T) {
	ctx := test.NewTestContext(t)

	var (
		req     = require.New(t)
		remotes = []common.Address{{1}, {2}, {3}, {4}}
		success atomic.Int64
		check   = func() bool {
			return int(success.Load()) >= events.TotalQuorumNum(1+len(remotes))
		}
		qPool = events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().WriteMode().WithExternalQuorumCheck(check))
		wg    sync.WaitGroup
	)

	wg.Add(1 + len(remotes))

	qPool.AddTask(func(ctx context.Context) error {
		defer wg.Done()
		success.Add(1)
		return nil
	})

	qPool.AddNodeTasks(remotes, func(ctx context.Context, node common.Address) error {
		defer wg.Done()
		success.Add(1)
		return nil
	})

	req.NoError(qPool.Wait())

	wg.Wait() // make goleak happy
}

func quorumPoolReadModeAllSuccess(t *testing.T) {
	ctx := test.NewTestContext(t)
	ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	defer cancel()
	require := require.New(t)

	pool := events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().ReadModeWithFractionAndTimeout(1.0, time.Second))

	for range 5 {
		pool.AddTask(func(ctx context.Context) error {
			return nil
		})
	}

	state, err := pool.WaitWithState()
	require.NoError(err)
	require.Equal(5, state.SuccessCount)
	require.Equal(0, len(state.TaskErrors))
}

func quorumPoolWriteModeQuorumSuccess(t *testing.T) {
	ctx := test.NewTestContext(t)
	ctx, cancel := context.WithTimeout(ctx, time.Second*10)
	defer cancel()
	require := require.New(t)

	pool := events.NewQuorumPool(ctx, events.NewQuorumPoolOpts().WriteModeWithTimeout(time.Second*8))

	for range 5 {
		pool.AddTask(func(ctx context.Context) error {
			return nil
		})
	}

	state, err := pool.WaitWithState()
	require.NoError(err)
	require.Equal(3, state.SuccessCount)
	require.Equal(0, len(state.TaskErrors))
}
