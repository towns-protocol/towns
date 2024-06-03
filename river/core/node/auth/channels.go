package auth

import (
	"context"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type Channels interface {
	IsDisabled(opts *bind.CallOpts, channelId shared.StreamId) (bool, error)
}

func NewChannels(
	ctx context.Context,
	version string,
	address common.Address,
	backend bind.ContractBackend,
) (Channels, error) {
	var err error
	var cc *base.Channels
	cc, err = base.NewChannels(address, backend)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", address, "version", version).
			Func("NewChannels").
			Message("Failed to initialize contract")
	}
	return &channelsProxy{
			contract: cc,
			ctx:      ctx,
		},
		nil
}

type channelsProxy struct {
	contract *base.Channels
	ctx      context.Context
}

var _ Channels = (*channelsProxy)(nil)

func (p *channelsProxy) IsDisabled(opts *bind.CallOpts, channelId shared.StreamId) (bool, error) {
	log := dlog.FromCtx(p.ctx)
	start := time.Now()
	log.Debug("IsDisabled", "channelId", channelId)

	ch, err := p.contract.GetChannel(opts, channelId)
	if err != nil {
		log.Error("IsDisabled", "channelId", channelId, "error", err)
		return false, err
	}

	log.Debug("IsDisabled", "channelId", channelId, "result", ch.Disabled, "duration", time.Since(start).Milliseconds())
	return ch.Disabled, nil
}
