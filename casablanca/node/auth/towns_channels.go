package auth

import (
	"casablanca/node/auth/contracts/base_goerli_towns_channels"
	"casablanca/node/auth/contracts/localhost_towns_channels"
	. "casablanca/node/base"
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

type TownsChannels interface {
	IsDisabled(opts *bind.CallOpts, channelNetworkId string) (bool, error)
}

type GeneratedTownsChannels interface {
	localhost_towns_channels.LocalhostTownsChannels | base_goerli_towns_channels.BaseGoerliTownsChannels
}

type TownsChannelsProxy[Contract GeneratedTownsChannels] struct {
	contract *Contract
}

var (
	getChannelCalls = infra.NewSuccessMetrics("get_channel_calls", contractCalls)
)

func NewTownsChannels(ethClient *ethclient.Client, chainId int, address common.Address) (TownsChannels, error) {
	var towns_channels_contract TownsChannels
	switch chainId {
	case infra.CHAIN_ID_LOCALHOST:
		localhost_contract, err := localhost_towns_channels.NewLocalhostTownsChannels(address, ethClient)
		if err != nil {
			return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
		}
		towns_channels_contract, err = NewTownsChannelsProxy[localhost_towns_channels.LocalhostTownsChannels](
			localhost_contract,
		)
		if err != nil {
			return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
		}
	case infra.CHAIN_ID_BASE_GOERLI:
		base_goerli_contract, err := base_goerli_towns_channels.NewBaseGoerliTownsChannels(address, ethClient)
		if err != nil {
			return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
		}
		towns_channels_contract, err = NewTownsChannelsProxy[base_goerli_towns_channels.BaseGoerliTownsChannels](
			base_goerli_contract,
		)
		if err != nil {
			return nil, WrapRiverError(protocol.Err_CANNOT_CONNECT, err)
		}
	default:
		return nil, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain", "chainId", chainId)
	}

	return towns_channels_contract, nil
}

func NewTownsChannelsProxy[C GeneratedTownsChannels](contract *C) (TownsChannels, error) {
	return &TownsChannelsProxy[C]{
		contract: contract,
	}, nil
}

func (za *TownsChannelsProxy[GeneratedTownsChannels]) IsDisabled(opts *bind.CallOpts, channelNetworkId string) (bool, error) {
	log := dlog.CtxLog(context.Background())
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("IsDisabled", "contract", start)
	var result bool
	switch v := any(za.contract).(type) {
	case *localhost_towns_channels.LocalhostTownsChannels:
		log.Debug("IsDisabled", "channelNetworkId", channelNetworkId)
		channelInfo, err := v.GetChannel(opts, channelNetworkId)
		if err != nil {
			getChannelCalls.FailInc()
			log.Error("IsDisabled", "channelNetworkId", channelNetworkId, "error", err)
			return false, err
		}
		result = channelInfo.Disabled
	case *base_goerli_towns_channels.BaseGoerliTownsChannels:
		log.Debug("IsDisabled", "channelNetworkId", channelNetworkId)
		channelInfo, err := v.GetChannel(opts, channelNetworkId)
		if err != nil {
			getChannelCalls.FailInc()
			log.Error("IsDisabled", "channelNetworkId", channelNetworkId, "error", err)
			return false, err
		}
		result = channelInfo.Disabled
	default:
		return false, RiverError(protocol.Err_CANNOT_CONNECT, "unsupported chain")
	}
	getChannelCalls.PassInc()
	log.Debug("IsDisabled", "channelNetworkId", channelNetworkId, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}
