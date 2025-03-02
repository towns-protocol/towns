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

type QuorumPoolOpts struct {
	// ContextMaker is used to transform initial context for each individual task.
	ContextMaker func(ctx context.Context) (context.Context, context.CancelFunc)

	// WaitForExtraSuccess is true if the quorum pool is waiting for extra successes
	// after quorum is achieved.
	WaitForExtraSuccess bool

	// ExternalQuorumCheck is a callback that returns true if quorum is reached.
	// If provided, the quorum pool will not count successes and errors, but will
	// use the provided callback to determine if quorum is reached.
	ExternalQuorumCheck func() bool

	// Tags are added to logging.
	Tags []any
}

func NewQuorumPoolOpts() *QuorumPoolOpts {
	return &QuorumPoolOpts{}
}

// WithTags adds tags that are added to log statements.
func (o *QuorumPoolOpts) WithTags(tags ...any) *QuorumPoolOpts {
	o.Tags = append(o.Tags, tags...)
	return o
}

// WriteMode sets context maker to return uncancelable context with default timeouts.
func (o *QuorumPoolOpts) WriteMode() *QuorumPoolOpts {
	o.ContextMaker = func(ctx context.Context) (context.Context, context.CancelFunc) {
		return utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
	}
	return o
}

// WriteModeWithTimeout sets context maker to return uncancelable context with given timeout.
func (o *QuorumPoolOpts) WriteModeWithTimeout(timeout time.Duration) *QuorumPoolOpts {
	o.ContextMaker = func(ctx context.Context) (context.Context, context.CancelFunc) {
		return utils.UncancelContextWithTimeout(ctx, timeout)
	}
	return o
}

// ReadMode sets context maker to return unmodified context and enables extra success waiting.
func (o *QuorumPoolOpts) ReadMode() *QuorumPoolOpts {
	o.ContextMaker = func(ctx context.Context) (context.Context, context.CancelFunc) {
		return ctx, func() {}
	}
	o.WaitForExtraSuccess = true
	return o
}

func (o *QuorumPoolOpts) WithExternalQuorumCheck(check func() bool) *QuorumPoolOpts {
	o.ExternalQuorumCheck = check
	return o
}

type QuorumPool struct {
	opts QuorumPoolOpts

	ctx context.Context

	// totalTasks keeps track of how many remote tasks are submitted.
	totalTasks int

	// resultAvailable is called each time the result of a local or remote action was available.
	// it guards totalSuccess and errors and is used to check if quorum is reached.
	resultAvailable *sync.Cond

	// totalSuccess keeps track how many local or remote tasks succeeded.
	totalSuccess int

	// errors captures all errors from local or remote tasks.
	errors []error
}

// NewQuorumPool creates a new quorum pool.
func NewQuorumPool(ctx context.Context, opts *QuorumPoolOpts) *QuorumPool {
	if opts == nil || opts.ContextMaker == nil {
		panic("ContextMaker is required")
	}

	return &QuorumPool{
		opts:            *opts,
		ctx:             ctx,
		resultAvailable: sync.NewCond(&sync.Mutex{}),
	}
}

// AddWorker executes f concurrently and captures the result for which the caller must wait.
func (q *QuorumPool) AddWorker(f func(ctx context.Context) error) {
	q.totalTasks++

	go func() {
		ctx, cancel := q.opts.ContextMaker(q.ctx)
		defer cancel()
		q.onTaskFinished(common.Address{}, f(ctx))
	}()
}

// AddNodeWorkers executes f on the given nodes concurrently and captures the results for which the caller must wait.
func (q *QuorumPool) AddNodeWorkers(
	nodes []common.Address,
	f func(ctx context.Context, node common.Address) error,
) {
	q.totalTasks += len(nodes)

	for _, node := range nodes {
		go func() {
			ctx, cancel := q.opts.ContextMaker(q.ctx)
			defer cancel()
			q.onTaskFinished(node, f(ctx, node))
		}()
	}
}

func (q *QuorumPool) onTaskFinished(remote common.Address, err error) {
	q.resultAvailable.L.Lock()
	if err == nil {
		q.totalSuccess++
	} else {
		q.errors = append(q.errors, err)
	}

	q.resultAvailable.Signal()
	q.resultAvailable.L.Unlock()

	// Cancel error is expected here: Wait() returns once quorum is achieved
	// and some remotes are still in progress.
	// Eventually Wait caller is going to cancel the context.
	// On the receiver side, write operations should be detached from cancelable contexts
	// (grpc transmits context cancellation from client to server), i.e. once local write
	// operation is started, it should not be cancelled and should proceed to completion.
	if err != nil && !errors.Is(err, context.Canceled) {
		tags := []any{"error", err, "remote", remote}
		tags = append(tags, q.opts.Tags...)
		logging.FromCtx(q.ctx).Warnw("QuorumPool: Replica Error", tags...)
	}
}

// Wait returns nil in case quorum is achieved, error otherwise.
// It must be called after all local and remote tasks are submitted.
func (q *QuorumPool) Wait() error {
	quorumNum := TotalQuorumNum(q.totalTasks)
	waitStarted := time.Now()

	q.resultAvailable.L.Lock()
	defer q.resultAvailable.L.Unlock()

	for {
		if q.opts.ExternalQuorumCheck == nil {
			if q.totalSuccess >= quorumNum { // quorum achieved
				if !q.opts.WaitForExtraSuccess {
					return nil
				}
				return q.waitForExtraSuccessLocked(waitStarted)
			}

			maxAllowedErrors := q.totalTasks - quorumNum
			if len(q.errors) > maxAllowedErrors { // not able to achieve quorum anymore
				baseErrors := q.errors
				q.errors = nil

				return RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed", baseErrors,
					"totalTasks", q.totalTasks,
					"quorumNum", quorumNum,
					"failed", len(baseErrors),
					"succeeded", q.totalSuccess)
			}
		} else {
			// determined if quorum is reached is done through external callback
			if q.opts.ExternalQuorumCheck() {
				return nil
			}
		}

		// if no more results are expected and quorum hasn't been reached return error
		if q.totalSuccess+len(q.errors) >= q.totalTasks {
			baseErrors := q.errors
			q.errors = nil

			return RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed: no more results expected", baseErrors,
				"totalTasks", q.totalTasks,
				"quorumNum", quorumNum,
				"failed", len(baseErrors),
				"succeeded", q.totalSuccess)
		}

		// wait for more task results
		q.resultAvailable.Wait()
	}
}

func (q *QuorumPool) waitForExtraSuccessLocked(waitStarted time.Time) error {
	// extraWaitTimestamp := time.Now()
	// alreadyWaited := extraWaitTimestamp.Sub(waitStarted)

	// contextDeadline, ok := q.ctx.Deadline()
	return nil

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
