package crypto

import (
	"context"
	"sync"
	"time"

	"github.com/river-build/river/core/node/dlog"
)

type BlockNumberChannel chan BlockNumber

func MakeBlockNumberChannel() BlockNumberChannel {
	return make(BlockNumberChannel, 128)
}

type BlockMonitor interface {
	AddListener(c BlockNumberChannel)
	Close()
}

// To stop, cancel the context passed to NewBlockMonitor.
func NewBlockMonitor(ctx context.Context, client BlockchainClient, initialBlockNum BlockNumber, expectedBlocktime time.Duration) (*blockMonitorImpl, error) {
	ctx, cancel := context.WithCancel(context.WithoutCancel(ctx))

	if expectedBlocktime == 0 {
		if initialBlockNum == 0 {
			expectedBlocktime = 2 * time.Second
		} else {
			headerCurr, err := client.HeaderByNumber(ctx, initialBlockNum.AsBigInt())
			if err != nil {
				cancel()
				return nil, err
			}
			headerPrev, err := client.HeaderByNumber(ctx, (initialBlockNum - 1).AsBigInt())
			if err != nil {
				cancel()
				return nil, err
			}
			expectedBlocktime = time.Millisecond * time.Duration(headerCurr.Time-headerPrev.Time)
		}
	}

	b := &blockMonitorImpl{
		ctx:               ctx,
		cancel:            cancel,
		initialBlockNum:   initialBlockNum,
		currentBlockNum:   initialBlockNum,
		expectedBlocktime: expectedBlocktime,
		client:            client,
	}

	go b.runNoSub()

	return b, nil
}

// Fake block tracker, to be replaced by a real one.
type blockMonitorImpl struct {
	ctx               context.Context
	cancel            context.CancelFunc
	initialBlockNum   BlockNumber
	expectedBlocktime time.Duration
	client            BlockchainClient

	mu              sync.Mutex
	subscribers     []BlockNumberChannel
	currentBlockNum BlockNumber
}

var _ BlockMonitor = (*blockMonitorImpl)(nil)

func (b *blockMonitorImpl) AddListener(c BlockNumberChannel) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.subscribers = append(b.subscribers, c)

	if b.currentBlockNum > b.initialBlockNum {
		for blockNum := b.initialBlockNum + 1; blockNum <= b.currentBlockNum; blockNum++ {
			c <- blockNum
		}
	}
}

func (b *blockMonitorImpl) Close() {
	b.cancel()
}

func (b *blockMonitorImpl) runNoSub() {
	log := dlog.FromCtx(b.ctx)

	shortWait := b.expectedBlocktime / 20
	longWait := b.expectedBlocktime - shortWait/2

	currBlock, err := b.client.BlockNumber(b.ctx)
	if err != nil {
		panic(err) // TODO: better handling here
	}
	b.notifySubscribers(BlockNumber(currBlock))

	defer b.closeSubscribers()
	for {
		for {
			if b.ctx.Err() != nil {
				return
			}

			nextBlock, err := b.client.BlockNumber(b.ctx)
			if err != nil {
				log.Error("BlockMonitor: Error getting block number", "err", err)
				continue
			}

			if b.ctx.Err() != nil {
				return
			}

			if nextBlock > currBlock {
				b.notifySubscribers(BlockNumber(nextBlock))
				currBlock = nextBlock
				break
			}

			if b.ctx.Err() != nil {
				return
			}
			time.Sleep(shortWait)
		}

		if b.ctx.Err() != nil {
			return
		}
		time.Sleep(longWait)
	}
}

func (b *blockMonitorImpl) notifySubscribers(currentBlockNum BlockNumber) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for i := b.currentBlockNum + 1; i <= currentBlockNum; i++ {
		for _, subscriber := range b.subscribers {
			subscriber <- i
		}
	}
	b.currentBlockNum = currentBlockNum
}

func (b *blockMonitorImpl) closeSubscribers() {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, subscriber := range b.subscribers {
		close(subscriber)
	}
	b.subscribers = nil
}
