package events

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/utils"
)

type QuorumPool struct {
	// hasLocalTask indicates if a local task was submitted
	hasLocalTask bool
	// remoteTasks keeps track of how many remote tasks are submitted.
	totalTasks int
	// tags are added to logging
	tags []any
	// Timeout is the timeout for each remote task.
	timeout time.Duration
	// externalQuorumCheck holds a callback that returns if quorum is reached.
	externalQuorumCheck func() bool
	// resultAvailable is called each time the result of a local or remote action was available.
	// it guards totalSuccess and errors and is used to check if quorum is reached.
	resultAvailable *sync.Cond
	// totalSuccess keeps track how many local or remote tasks succeeded.
	totalSuccess int
	// errors captures all errors from local or remote tasks.
	errors []error
}

// NewQuorumPool creates a new quorum pool.
func NewQuorumPool(tags ...any) *QuorumPool {
	return NewQuorumPoolWithTimeoutForRemotes(0, tags...)
}

// NewQuorumPoolWithTimeoutForRemotes creates a new quorum pool with a global timeout for remote tasks.
func NewQuorumPoolWithTimeoutForRemotes(timeout time.Duration, tags ...any) *QuorumPool {
	return &QuorumPool{timeout: timeout, tags: tags, resultAvailable: sync.NewCond(&sync.Mutex{})}
}

// NewQuorumPoolWithQuorumCheck creates a new quorum pool that uses the provided check callback to
// determine if quorum is reached instead of counting success/errors returned by the submitted tasks.
func NewQuorumPoolWithQuorumCheck(check func() bool, tags ...any) *QuorumPool {
	return &QuorumPool{externalQuorumCheck: check, tags: tags, resultAvailable: sync.NewCond(&sync.Mutex{})}
}

// GoLocal executes f concurrently and captures the result for which the caller must wait.
func (q *QuorumPool) GoLocal(ctx context.Context, f func(ctx context.Context) error) {
	q.hasLocalTask = true
	q.totalTasks++

	go func() {
		q.onTaskFinished(ctx, nil, f(ctx))
	}()
}

// GoRemotes executes f on the given nodes concurrently and captures the results for which the caller must wait.
func (q *QuorumPool) GoRemotes(
	ctx context.Context,
	nodes []common.Address,
	f func(ctx context.Context, node common.Address) error,
) {
	q.totalTasks += len(nodes)

	for _, node := range nodes {
		var ctx2 context.Context
		var cancel context.CancelFunc
		if q.timeout > 0 {
			ctx2, cancel = utils.UncancelContextWithTimeout(ctx, q.timeout)
		} else {
			ctx2, cancel = utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
		}
		go func() {
			defer cancel()
			q.onTaskFinished(ctx2, &node, f(ctx2, node))
		}()
	}
}

func (q *QuorumPool) onTaskFinished(ctx context.Context, remote *common.Address, err error) {
	q.resultAvailable.L.Lock()
	if err == nil {
		q.totalSuccess++
	} else {
		q.errors = append(q.errors, err)
	}

	q.resultAvailable.Signal()
	q.resultAvailable.L.Unlock()

	if err != nil {
		tags := []any{"error", err}
		tags = append(tags, q.tags...)
		if remote == nil {
			logging.FromCtx(ctx).Warnw("QuorumPool: GoLocal: Error", tags...)
		} else if !errors.Is(err, context.Canceled) {
			// Cancel error is expected here: Wait() returns once quorum is achieved
			// and some remotes are still in progress.
			// Eventually Wait caller is going to cancel the context.
			// On the receiver side, write operations should be detached from cancelable contexts
			// (grpc transmits context cancellation from client to server), i.e. once local write
			// operation is started, it should not be cancelled and should proceed to completion.
			tags := []any{"error", err, "node", *remote}
			tags = append(tags, q.tags...)
			logging.FromCtx(ctx).Warnw("QuorumPool: GoRemotes: Error", tags...)
		}
	}
}

// Wait returns nil in case quorum is achieved, error otherwise.
// It must be called after all local and remote tasks are submitted.
func (q *QuorumPool) Wait() error {
	quorumNum := TotalQuorumNum(q.totalTasks)

	q.resultAvailable.L.Lock()
	defer q.resultAvailable.L.Unlock()

	for {
		// determined if quorum is reached is done through external callback
		if q.externalQuorumCheck != nil && q.externalQuorumCheck() {
			return nil
		}

		if q.externalQuorumCheck == nil && q.totalSuccess >= quorumNum { // quorum achieved
			return nil
		}

		if q.externalQuorumCheck == nil && len(q.errors) > (q.totalTasks - quorumNum) { // not able to achieve quorum anymore
			remotes := q.totalTasks
			if q.hasLocalTask {
				remotes--
			}

			baseErrors := q.errors
			q.errors = nil

			return RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed", baseErrors,
				"remotes", remotes,
				"local", q.hasLocalTask,
				"quorumNum", quorumNum,
				"failed", len(baseErrors),
				"succeeded", q.totalSuccess)
		}

		// if no more results are expected and quorum hasn't been reached return error
		if q.totalSuccess+len(q.errors) >= q.totalTasks {
			remotes := q.totalTasks
			if q.hasLocalTask {
				remotes--
			}

			baseErrors := q.errors
			q.errors = nil

			return RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed", baseErrors,
				"remotes", remotes,
				"local", q.hasLocalTask,
				"quorumNum", quorumNum,
				"failed", len(baseErrors),
				"succeeded", q.totalSuccess)
		}

		// wait for more task results
		q.resultAvailable.Wait()
	}
}

func TotalQuorumNum(totalNumNodes int) int {
	return (totalNumNodes + 1) / 2
}

// RemoteQuorumNum returns number of remotes that need to succeed for quorum based on where the local is present.
func RemoteQuorumNum(remotes int, local bool) int {
	if local {
		return TotalQuorumNum(remotes+1) - 1
	} else {
		return TotalQuorumNum(remotes)
	}
}
