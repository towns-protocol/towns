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

	// WaitForExtraSuccessFraction is the fraction of the time it took to achieve quorum
	// that the quorum pool will wait for extra successes after quorum is achieved.
	// I.e. for 5 tasks, and setting 1.0, and if quorum was achieved in 1 second,
	// the quorum pool will wait for extra successes for additional 1 second.
	// This is can be used in read mode to get more results, while not waiting for the unavailable replicas.
	// If both WaitForExtraSuccessFraction and WaitForExtraSuccessTimeout are 0,
	// the quorum pool will not wait for extra successes.
	WaitForExtraSuccessFraction float64

	// WaitForExtraSuccessTimeout is additional timeout for waiting for extra successes.
	// See WaitForExtraSuccessFraction for more details.
	WaitForExtraSuccessTimeout time.Duration

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
	o.WaitForExtraSuccessFraction = 1.0
	o.WaitForExtraSuccessTimeout = 100 * time.Millisecond
	return o
}

func (o *QuorumPoolOpts) ReadModeWithFractionAndTimeout(fraction float64, timeout time.Duration) *QuorumPoolOpts {
	o = o.ReadMode()
	o.WaitForExtraSuccessFraction = fraction
	o.WaitForExtraSuccessTimeout = timeout
	return o
}

func (o *QuorumPoolOpts) WithExternalQuorumCheck(check func() bool) *QuorumPoolOpts {
	o.ExternalQuorumCheck = check
	return o
}

func (o *QuorumPoolOpts) shouldWaitForExtraSuccess() bool {
	return o.WaitForExtraSuccessFraction > 0 || o.WaitForExtraSuccessTimeout > 0
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

type QuorumState struct {
	TaskCount    int
	QuorumNum    int
	SuccessCount int
	TaskErrors   []error
	WaitStarted  time.Time
}

func (s *QuorumState) update(err error) {
	if err != nil {
		s.TaskErrors = append(s.TaskErrors, err)
	} else {
		s.SuccessCount++
	}
}

func (s *QuorumState) checkAllDone() bool {
	return s.SuccessCount+len(s.TaskErrors) >= s.TaskCount
}

func (s *QuorumState) checkDoneNoExternal() (bool, error) {
	// Is quorum achieved?
	if s.SuccessCount >= s.QuorumNum {
		return true, nil
	}

	// Can still achieve quorum?
	maxAllowedErrors := s.TaskCount - s.QuorumNum
	if len(s.TaskErrors) > maxAllowedErrors {
		return true, RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed", s.TaskErrors,
			"totalTasks", s.TaskCount,
			"quorumNum", s.QuorumNum,
			"failed", len(s.TaskErrors),
			"succeeded", s.SuccessCount)
	}

	return false, nil
}

func (s *QuorumState) checkDoneExternal(check func() bool) (bool, error) {
	// Is quorum achieved?
	if check() {
		return true, nil
	}

	// if no more results are expected and quorum hasn't been reached return error
	if s.checkAllDone() {
		return true, RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed: no more results expected", s.TaskErrors,
			"totalTasks", s.TaskCount,
			"quorumNum", s.QuorumNum,
			"failed", len(s.TaskErrors),
			"succeeded", s.SuccessCount)
	}

	return false, nil
}

func (s *QuorumState) checkDone(check func() bool) (bool, error) {
	if check == nil {
		return s.checkDoneNoExternal()
	} else {
		return s.checkDoneExternal(check)
	}
}

// Wait returns nil in case quorum is achieved, error otherwise.
// It must be called after all local and remote tasks are added.
func (q *QuorumPool) Wait() error {
	_, err := q.WaitWithState()
	return err
}

func (q *QuorumPool) WaitWithState() (*QuorumState, error) {
	state := &QuorumState{
		TaskCount:   len(q.tasks),
		QuorumNum:   TotalQuorumNum(len(q.tasks)),
		WaitStarted: time.Now(),
	}
	q.taskResults = make(chan error, state.TaskCount)

	for _, task := range q.tasks {
		go task()
	}

	for {
		select {
		case err := <-q.taskResults:
			state.update(err)
			done, err := state.checkDone(q.opts.ExternalQuorumCheck)
			if done {
				if err == nil && q.opts.shouldWaitForExtraSuccess() {
					q.waitForExtraSuccess(state)
					return state, nil
				}
				return state, err
			}
		case <-q.ctx.Done():
			return state, q.ctx.Err()
		}
	}
}

func (q *QuorumPool) waitForExtraSuccess(state *QuorumState) {
	now := time.Now()
	alreadyWaited := now.Sub(state.WaitStarted)

	var waitTimeout time.Duration
	if q.opts.WaitForExtraSuccessFraction > 0 {
		waitTimeout += time.Duration(float64(alreadyWaited) * q.opts.WaitForExtraSuccessFraction)
	}
	if q.opts.WaitForExtraSuccessTimeout > 0 {
		waitTimeout += q.opts.WaitForExtraSuccessTimeout
	}

	contextDeadline, ok := q.ctx.Deadline()
	if ok {
		// Only wait for up to 90% of the original context timeout
		contextDeadlineTrim := contextDeadline.Sub(state.WaitStarted) / 10
		contextDeadline := contextDeadline.Add(-contextDeadlineTrim)
		contextTimeout := contextDeadline.Sub(now)
		if contextTimeout <= 0 {
			return
		}
		if contextTimeout < waitTimeout {
			waitTimeout = contextTimeout
		}
	}

	for {
		select {
		case err := <-q.taskResults:
			state.update(err)
			if state.checkAllDone() {
				return
			}
		case <-time.After(waitTimeout):
			return
		case <-q.ctx.Done():
			return // return success anyway since quorum already achieved
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
