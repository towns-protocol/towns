package rpc

import "github.com/ethereum/go-ethereum/common"

type quorumPool struct {
	localErrChannel  chan error
	remotes          int
	remoteErrChannel chan error
}

func newQuorumPool(maxRemotes int) *quorumPool {
	var remoteErrChannel chan error
	if maxRemotes > 0 {
		remoteErrChannel = make(chan error, maxRemotes)
	}
	return &quorumPool{
		remoteErrChannel: remoteErrChannel,
	}
}

func (q *quorumPool) GoLocal(f func() error) {
	q.localErrChannel = make(chan error, 1)
	go func() {
		err := f()
		q.localErrChannel <- err
	}()
}

func (q *quorumPool) GoRemote(node common.Address, f func(node common.Address) error) {
	q.remotes++
	go func(node common.Address) {
		err := f(node)
		q.remoteErrChannel <- err
	}(node)
}

func (q *quorumPool) Wait() error {
	// First wait for local if any.
	if q.localErrChannel != nil {
		if err := <-q.localErrChannel; err != nil {
			return err
		}
	}

	// Then wait for majority quorum of remotes.
	if q.remotes > 0 {
		remoteQuorum := remoteQuorumNum(q.remotes, q.localErrChannel != nil)

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
		return firstErr
	}

	return nil
}
