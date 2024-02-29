package auth

import (
	"context"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/contracts/dev"
	v3 "github.com/river-build/river/core/node/contracts/v3"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type TownsChannels interface {
	IsDisabled(opts *bind.CallOpts, channelNetworkId string) (bool, error)
}

type v001Caller struct {
	contract *v3.Channels
}

var _ TownsChannels = (*v001Caller)(nil)

func (c *v001Caller) IsDisabled(opts *bind.CallOpts, channelNetworkId string) (bool, error) {
	ch, err := c.contract.GetChannel(opts, channelNetworkId)
	if err != nil {
		return false, err
	}
	return ch.Disabled, nil
}

type devCaller struct {
	contract *dev.Channels
}

var _ TownsChannels = (*devCaller)(nil)

func (c *devCaller) IsDisabled(opts *bind.CallOpts, channelNetworkId string) (bool, error) {
	ch, err := c.contract.GetChannel(opts, channelNetworkId)
	if err != nil {
		return false, err
	}
	return ch.Disabled, nil
}

var getChannelCalls = infra.NewSuccessMetrics("get_channel_calls", contractCalls)

func NewTownsChannels(ctx context.Context, version string, address common.Address, backend bind.ContractBackend) (TownsChannels, error) {
	var c TownsChannels
	var err error
	switch version {
	case contracts.DEV:
		var cc *dev.Channels
		cc, err = dev.NewChannels(address, backend)
		if cc != nil {
			c = &devCaller{contract: cc}
		}
	case contracts.V3:
		var cc *v3.Channels
		cc, err = v3.NewChannels(address, backend)
		if cc != nil {
			c = &v001Caller{contract: cc}
		}
	}
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", address, "version", version).
			Func("NewTownsChannels").
			Message("Failed to initialize contract")
	}
	if c == nil {
		return nil, RiverError(
			Err_CANNOT_CONNECT,
			"Unsupported version",
			"address",
			address,
			"version",
			version,
		).Func("NewTownsChannels")
	}
	return &townsChannelsProxy{
			contract: c,
			ctx:      ctx,
		},
		nil
}

type townsChannelsProxy struct {
	contract TownsChannels
	ctx      context.Context
}

var _ TownsChannels = (*townsChannelsProxy)(nil)

func (p *townsChannelsProxy) IsDisabled(opts *bind.CallOpts, channelNetworkId string) (bool, error) {
	log := dlog.FromCtx(p.ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("IsDisabled", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("IsDisabled", "channelNetworkId", channelNetworkId)
	disabled, err := p.contract.IsDisabled(opts, channelNetworkId)
	if err != nil {
		getChannelCalls.FailInc()
		log.Error("IsDisabled", "channelNetworkId", channelNetworkId, "error", err)
		return false, err
	}
	getChannelCalls.PassInc()
	log.Debug("IsDisabled", "channelNetworkId", channelNetworkId, "result", disabled, "duration", time.Since(start).Milliseconds())
	return disabled, nil
}
