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

type QuorumPool struct {
	localErrChannel  chan error
	remotes          int
	remoteErrChannel chan error
	tags             []any
	Timeout          time.Duration
}

func NewQuorumPool(tags ...any) *QuorumPool {
	return &QuorumPool{
		tags: tags,
	}
}

func (q *QuorumPool) GoLocal(ctx context.Context, f func(ctx context.Context) error) {
	q.localErrChannel = make(chan error, 1)
	go func() {
		err := f(ctx)
		q.localErrChannel <- err
		if err != nil {
			tags := []any{"error", err}
			tags = append(tags, q.tags...)
			logging.FromCtx(ctx).Warnw("QuorumPool: GoLocal: Error", tags...)
		}
	}()
}

func (q *QuorumPool) GoRemotes(
	ctx context.Context,
	nodes []common.Address,
	f func(ctx context.Context, node common.Address) error,
) {
	if len(nodes) == 0 {
		return
	}
	q.remoteErrChannel = make(chan error, len(nodes))
	q.remotes += len(nodes)
	for _, node := range nodes {
		var ctx2 context.Context
		var cancel context.CancelFunc
		if q.Timeout > 0 {
			ctx2, cancel = utils.UncancelContextWithTimeout(ctx, q.Timeout)
		} else {
			ctx2, cancel = utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
		}
		go func() {
			defer cancel()
			q.executeRemote(ctx2, node, f)
		}()
	}
}

func (q *QuorumPool) executeRemote(
	ctx context.Context,
	node common.Address,
	f func(ctx context.Context, node common.Address) error,
) {
	err := f(ctx, node)
	q.remoteErrChannel <- err

	// Cancel error is expected here: Wait() returns once quorum is achieved
	// and some remotes are still in progress.
	// Eventually Wait caller is going to cancel the context.
	// On the receiver side, write operations should be detached from cancelable contexts
	// (grpc transmits context cancellation from client to server), i.e. once local write
	// operation is started, it should not be cancelled and should proceed to completion.
	if err != nil && !errors.Is(err, context.Canceled) {
		tags := []any{"error", err, "node", node}
		tags = append(tags, q.tags...)
		logging.FromCtx(ctx).Warnw("QuorumPool: GoRemotes: Error", tags...)
	}
}

func (q *QuorumPool) Wait() error {
	// TODO: FIX: REPLICATION: succeed if enough remotes succeed even if local fails.
	// First wait for local if any.
	if q.localErrChannel != nil {
		if err := <-q.localErrChannel; err != nil {
			return RiverErrorWithBase(Err_QUORUM_FAILED, "local failed", err)
		}
	}

	// Then wait for majority quorum of remotes.
	if q.remotes > 0 {
		remoteQuorum := RemoteQuorumNum(q.remotes, q.localErrChannel != nil)

		var errs []error
		success := 0
		for i := 0; i < q.remotes; i++ {
			err := <-q.remoteErrChannel
			if err == nil {
				success++
				if success >= remoteQuorum {
					return nil
				}
			} else {
				errs = append(errs, err)
				if len(errs) > q.remotes-remoteQuorum {
					return RiverErrorWithBases(Err_QUORUM_FAILED, "quorum failed", errs, "remotes", q.remotes, "remoteQuorum", remoteQuorum, "failed", len(errs), "succeeded", success)
				}
			}
		}
		return RiverErrorWithBases(Err_INTERNAL, "QuorumPool.Wait: should succeed or fail by this point", errs)
	}

	return nil
}

func TotalQuorumNum(totalNumNodes int) int {
	return (totalNumNodes + 1) / 2
}

// Returns number of remotes that need to succeed for quorum based on where the local is present.
func RemoteQuorumNum(remotes int, local bool) int {
	if local {
		return TotalQuorumNum(remotes+1) - 1
	} else {
		return TotalQuorumNum(remotes)
	}
}
