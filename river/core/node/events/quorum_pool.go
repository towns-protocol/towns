package events

import (
	"context"
	"errors"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/utils"
)

type QuorumPool struct {
	localErrChannel  chan error
	remotes          int
	remoteErrChannel chan error
	tags             []any
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
			dlog.FromCtx(ctx).Warn("QuorumPool: GoLocal: Error", tags...)
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
		ctx, cancel := utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
		go func() {
			defer cancel()
			q.executeRemote(ctx, node, f)
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
		dlog.FromCtx(ctx).Warn("QuorumPool: GoRemotes: Error", tags...)
	}
}

func (q *QuorumPool) Wait() error {
	// TODO: FIX: REPLICATION: succeed if enough remotes succeed even if local fails.
	// First wait for local if any.
	if q.localErrChannel != nil {
		if err := <-q.localErrChannel; err != nil {
			return err
		}
	}

	// Then wait for majority quorum of remotes.
	if q.remotes > 0 {
		remoteQuorum := RemoteQuorumNum(q.remotes, q.localErrChannel != nil)

		var firstErr error
		success := 0
		failure := 0
		for i := 0; i < q.remotes; i++ {
			err := <-q.remoteErrChannel
			if err == nil {
				success++
				if success >= remoteQuorum {
					return nil
				}
			} else {
				if firstErr == nil {
					firstErr = err
				}
				failure++
				if failure > q.remotes-remoteQuorum {
					return firstErr
				}
			}
		}
		// TODO: agument error with more info.
		return firstErr
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
