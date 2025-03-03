package events

import (
	"context"
	"errors"
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

	tasks       []func()
	taskResults chan error
}

// NewQuorumPool creates a new quorum pool.
func NewQuorumPool(ctx context.Context, opts *QuorumPoolOpts) *QuorumPool {
	if opts == nil || opts.ContextMaker == nil {
		panic("ContextMaker is required")
	}

	return &QuorumPool{
		opts: *opts,
		ctx:  ctx,
	}
}

// AddTask executes f concurrently and captures the result for which the caller must wait.
func (q *QuorumPool) AddTask(f func(ctx context.Context) error) {
	q.tasks = append(q.tasks, func() {
		ctx, cancel := q.opts.ContextMaker(q.ctx)
		defer cancel()
		result := f(ctx)
		q.onTaskFinished(common.Address{}, result)
	})
}

// AddNodeTasks executes f on the given nodes concurrently and captures the results for which the caller must wait.
func (q *QuorumPool) AddNodeTasks(
	nodes []common.Address,
	f func(ctx context.Context, node common.Address) error,
) {
	for _, node := range nodes {
		q.tasks = append(q.tasks, func() {
			ctx, cancel := q.opts.ContextMaker(q.ctx)
			defer cancel()
			result := f(ctx, node)
			q.onTaskFinished(node, result)
		})
	}
}

func (q *QuorumPool) onTaskFinished(remote common.Address, err error) {
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

	q.taskResults <- err
}

type quorumState struct {
	taskCount    int
	quorumNum    int
	successCount int
	taskErrors   []error
}

func (s *quorumState) update(err error) {
	if err != nil {
		s.taskErrors = append(s.taskErrors, err)
	} else {
		s.successCount++
	}
}

func (s *quorumState) checkDoneNoExternal() (bool, error) {
	// Is quorum achieved?
	if s.successCount >= s.quorumNum {
		return true, nil
	}

	// Can still achieve quorum?
	maxAllowedErrors := s.taskCount - s.quorumNum
	if len(s.taskErrors) > maxAllowedErrors {
		return true, RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed", s.taskErrors,
			"totalTasks", s.taskCount,
			"quorumNum", s.quorumNum,
			"failed", len(s.taskErrors),
			"succeeded", s.successCount)
	}

	return false, nil
}

func (s *quorumState) checkDoneExternal(check func() bool) (bool, error) {
	// Is quorum achieved?
	if check() {
		return true, nil
	}

	// if no more results are expected and quorum hasn't been reached return error
	if s.successCount+len(s.taskErrors) >= s.taskCount {
		return true, RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed: no more results expected", s.taskErrors,
			"totalTasks", s.taskCount,
			"quorumNum", s.quorumNum,
			"failed", len(s.taskErrors),
			"succeeded", s.successCount)
	}

	return false, nil
}

func (s *quorumState) checkDone(check func() bool) (bool, error) {
	if check == nil {
		return s.checkDoneNoExternal()
	} else {
		return s.checkDoneExternal(check)
	}
}

// Wait returns nil in case quorum is achieved, error otherwise.
// It must be called after all local and remote tasks are added.
func (q *QuorumPool) Wait() error {
	state := &quorumState{
		taskCount: len(q.tasks),
		quorumNum: TotalQuorumNum(len(q.tasks)),
	}
	q.taskResults = make(chan error, state.taskCount)

	for _, task := range q.tasks {
		go task()
	}

	for {
		select {
		case err := <-q.taskResults:
			state.update(err)
			done, err := state.checkDone(q.opts.ExternalQuorumCheck)
			if done {
				return err
			}
		case <-q.ctx.Done():
			return q.ctx.Err()
		}
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
