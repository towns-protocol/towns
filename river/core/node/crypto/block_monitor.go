package crypto

import (
	"context"
	"sync"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
)

type BlockNumberChannel chan BlockNumber

func MakeBlockNumberChannel() BlockNumberChannel {
	return make(BlockNumberChannel, 128)
}

type BlockMonitor interface {
	AddListener(c BlockNumberChannel, lastKnownBlockNum BlockNumber) error
	Close()
}

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
		currentBlockNum:   initialBlockNum,
		expectedBlocktime: expectedBlocktime,
		client:            client,
	}

	go b.runNoSub()

	return b, nil
}

type blockMonitorSub struct {
	c       BlockNumberChannel
	lastNum BlockNumber
}

// TODO: this block monitor polls the blockchain for new blocks.
// Add support for websockets and use them with subscription if available instead.
type blockMonitorImpl struct {
	ctx               context.Context
	cancel            context.CancelFunc
	expectedBlocktime time.Duration
	client            BlockchainClient

	mu              sync.Mutex
	subscribers     []blockMonitorSub
	currentBlockNum BlockNumber
}

var _ BlockMonitor = (*blockMonitorImpl)(nil)

func (b *blockMonitorImpl) AddListener(c BlockNumberChannel, lastKnownBlockNum BlockNumber) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.subscribers = append(b.subscribers, blockMonitorSub{c, lastKnownBlockNum})

	for blockNum := lastKnownBlockNum + 1; blockNum <= b.currentBlockNum; blockNum++ {
		select {
		case c <- blockNum:
			continue
		default:
			return RiverError(Err_INTERNAL, "BlockMonitor: subscriber buffer full")
		}
	}
	return nil
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

	if currentBlockNum <= b.currentBlockNum {
		return
	}

	for i := 0; i < len(b.subscribers); i++ {
		if b.subscribers[i].lastNum < currentBlockNum {
			for blockNum := b.subscribers[i].lastNum + 1; blockNum <= currentBlockNum; blockNum++ {
				b.subscribers[i].c <- blockNum
			}
			b.subscribers[i].lastNum = currentBlockNum
		}
	}

	b.currentBlockNum = currentBlockNum
}

func (b *blockMonitorImpl) closeSubscribers() {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, subscriber := range b.subscribers {
		close(subscriber.c)
	}
	b.subscribers = nil
}
