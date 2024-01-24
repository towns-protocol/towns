package crypto

import (
	"context"
	"sync"
	"time"
)

type OnNewBlock func(ctx context.Context, blockNum int64, blockHash []byte)

type BlockMonitor interface {
	AddListener(listener OnNewBlock)
}

// To stop, cancel the context passed to NewFakeBlockMonitor.
func NewFakeBlockMonitor(ctx context.Context, fakeBlockTimeMs int64) *fakeBlockMonitor {
	b := &fakeBlockMonitor{
		ctx: ctx,
	}

	b.mutex.Lock()
	defer b.mutex.Unlock()

	var blockTime time.Duration
	if fakeBlockTimeMs <= 0 {
		blockTime = time.Second * 2
	} else {
		blockTime = time.Microsecond * time.Duration(fakeBlockTimeMs)
	}

	go b.runTicker(blockTime)

	return b
}

// Fake block tracker, to be replaced by a real one.
type fakeBlockMonitor struct {
	ctx         context.Context
	mutex       sync.Mutex
	subscribers []OnNewBlock
}

var _ BlockMonitor = (*fakeBlockMonitor)(nil)

func (b *fakeBlockMonitor) AddListener(listener OnNewBlock) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	b.subscribers = append(b.subscribers, listener)
}

func (b *fakeBlockMonitor) runTicker(blockTime time.Duration) {
	// Align to the next "fake block".
	now := time.Now()

	blockStartTime := now.Truncate(blockTime)
	startOf2024 := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC)
	blockNum := blockStartTime.Sub(startOf2024).Nanoseconds() / blockTime.Nanoseconds()

	adjustment := blockTime - (now.Sub(blockStartTime))
	if adjustment > 0 {
		time.Sleep(adjustment)
		blockNum++
	}

	ticker := time.NewTicker(blockTime)
	for {
		select {
		case <-b.ctx.Done():
			ticker.Stop()
			return
		case <-ticker.C:
			blockNum++
			b.notifySubscribers(blockNum, nil)
		}
	}
}

func (b *fakeBlockMonitor) notifySubscribers(blockNum int64, blockHash []byte) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	for _, subscriber := range b.subscribers {
		go subscriber(b.ctx, blockNum, blockHash)
	}
}
