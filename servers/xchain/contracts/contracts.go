package contracts

import (
	"math/big"
	"servers/xchain/config"
	"servers/xchain/contracts/dev"
	v3 "servers/xchain/contracts/v3"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

type IRuleEntitlementOperation struct {
	OpType uint8
	Index  uint8
}

type IRuleEntitlementCheckOperation struct {
	OpType          uint8
	ChainId         *big.Int
	ContractAddress common.Address
	Threshold       *big.Int
}

// IRuleEntitlementLogicalOperation is an auto generated low-level Go binding around an user-defined struct.
type IRuleEntitlementLogicalOperation struct {
	LogOpType           uint8
	LeftOperationIndex  uint8
	RightOperationIndex uint8
}

type IEntitlementGated struct {
	v3IEntitlementGated  *v3.IEntitlementGated
	devIEntitlementGated *dev.IEntitlementGated
}

func NewIEntitlementGated(address common.Address, backend bind.ContractBackend) (*IEntitlementGated, error) {
	res := &IEntitlementGated{}
	if config.GetConfig().GetContractVersion() == "v3" {
		contract, err := v3.NewIEntitlementGated(address, backend)
		res.v3IEntitlementGated = contract
		return res, err
	} else {
		contract, err := dev.NewIEntitlementGated(address, backend)
		res.devIEntitlementGated = contract
		return res, err
	}
}

func (g *IEntitlementGated) RequestEntitlementCheck(opts *bind.TransactOpts) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return g.v3IEntitlementGated.RequestEntitlementCheck(opts)
	} else {
		return g.devIEntitlementGated.RequestEntitlementCheck(opts)
	}
}

func (g *IEntitlementGated) PostEntitlementCheckResult(opts *bind.TransactOpts, transactionId [32]byte, result uint8) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return g.v3IEntitlementGated.PostEntitlementCheckResult(opts, transactionId, result)
	} else {
		return g.devIEntitlementGated.PostEntitlementCheckResult(opts, transactionId, result)
	}
}

func (g *IEntitlementGated) RemoveTransaction(opts *bind.TransactOpts, transactionId [32]byte) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return g.v3IEntitlementGated.RemoveTransaction(opts, transactionId)
	} else {
		return g.devIEntitlementGated.RemoveTransaction(opts, transactionId)
	}
}

func (g *IEntitlementGated) WatchEntitlementCheckResultPosted(opts *bind.WatchOpts, sink chan<- *IEntitlementGatedEntitlementCheckResultPosted, transactionId [][32]byte) (event.Subscription, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		v3Sink := make(chan *v3.IEntitlementGatedEntitlementCheckResultPosted)
		sub, err := g.v3IEntitlementGated.WatchEntitlementCheckResultPosted(opts, v3Sink, transactionId)
		go func() {
			for {
				select {
				case v3Event := <-v3Sink:
					shimEvent := convertV3ToShimResultPosted(v3Event)
					sink <- shimEvent
				}
			}
		}()
		return sub, err
	} else {
		devSink := make(chan *dev.IEntitlementGatedEntitlementCheckResultPosted)
		sub, err := g.devIEntitlementGated.WatchEntitlementCheckResultPosted(opts, devSink, transactionId)
		go func() {
			for {
				select {
				case devEvent := <-devSink:
					shimEvent := converDevToShimResultPosted(devEvent)
					sink <- shimEvent
				}
			}
		}()
		return sub, err
	}
}

type IEntitlementChecker struct {
	v3IEntitlementChecker  *v3.IEntitlementChecker
	devIEntitlementChecker *dev.IEntitlementChecker
}

func NewIEntitlementChecker(address common.Address, backend bind.ContractBackend) (*IEntitlementChecker, error) {
	res := &IEntitlementChecker{}
	if config.GetConfig().GetContractVersion() == "v3" {
		contract, err := v3.NewIEntitlementChecker(address, backend)
		res.v3IEntitlementChecker = contract
		return res, err
	} else {
		contract, err := dev.NewIEntitlementChecker(address, backend)
		res.devIEntitlementChecker = contract
		return res, err
	}
}

func (c *IEntitlementChecker) RegisterNode(opts *bind.TransactOpts) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return c.v3IEntitlementChecker.RegisterNode(opts)
	} else {
		return c.devIEntitlementChecker.RegisterNode(opts)
	}
}

func (c *IEntitlementChecker) UnregisterNode(opts *bind.TransactOpts) (*types.Transaction, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		return c.v3IEntitlementChecker.UnregisterNode(opts)
	} else {
		return c.devIEntitlementChecker.UnregisterNode(opts)
	}
}

func (c *IEntitlementChecker) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *IEntitlementCheckerEntitlementCheckRequested, nodeAddress []common.Address) (event.Subscription, error) {
	if config.GetConfig().GetContractVersion() == "v3" {
		v3Sink := make(chan *v3.IEntitlementCheckerEntitlementCheckRequested)
		sub, err := c.v3IEntitlementChecker.WatchEntitlementCheckRequested(opts, v3Sink, nodeAddress)
		go func() {
			for {
				select {
				case v3Event := <-v3Sink:
					shimEvent := convertV3ToShimCheckRequested(v3Event)
					sink <- shimEvent
				}
			}
		}()
		return sub, err
	} else {
		devSink := make(chan *dev.IEntitlementCheckerEntitlementCheckRequested)
		sub, err := c.devIEntitlementChecker.WatchEntitlementCheckRequested(opts, devSink, nodeAddress)
		go func() {
			for {
				select {
				case devEvent := <-devSink:
					shimEvent := convertDevToShimCheckRequested(devEvent)
					sink <- shimEvent
				}
			}
		}()
		return sub, err
	}
}

type IEntitlementGatedEntitlementCheckResultPosted struct {
	TransactionId [32]byte
	Result        uint8
	Raw           types.Log // Blockchain specific contextual infos
}

type IEntitlementCheckerEntitlementCheckRequested struct {
	CallerAddress   common.Address
	TransactionId   [32]byte
	SelectedNodes   []common.Address
	ContractAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

func convertV3ToShimCheckRequested(v3Event *v3.IEntitlementCheckerEntitlementCheckRequested) *IEntitlementCheckerEntitlementCheckRequested {
	return &IEntitlementCheckerEntitlementCheckRequested{
		CallerAddress:   v3Event.CallerAddress,
		TransactionId:   v3Event.TransactionId,
		SelectedNodes:   v3Event.SelectedNodes,
		ContractAddress: v3Event.ContractAddress,
		Raw:             v3Event.Raw,
	}
}

func convertDevToShimCheckRequested(devEvent *dev.IEntitlementCheckerEntitlementCheckRequested) *IEntitlementCheckerEntitlementCheckRequested {
	return &IEntitlementCheckerEntitlementCheckRequested{
		CallerAddress:   devEvent.CallerAddress,
		TransactionId:   devEvent.TransactionId,
		SelectedNodes:   devEvent.SelectedNodes,
		ContractAddress: devEvent.ContractAddress,
		Raw:             devEvent.Raw,
	}
}

func convertV3ToShimResultPosted(v3Event *v3.IEntitlementGatedEntitlementCheckResultPosted) *IEntitlementGatedEntitlementCheckResultPosted {
	return &IEntitlementGatedEntitlementCheckResultPosted{
		TransactionId: v3Event.TransactionId,
		Result:        v3Event.Result,
		Raw:           v3Event.Raw,
	}
}

func converDevToShimResultPosted(devEvent *dev.IEntitlementGatedEntitlementCheckResultPosted) *IEntitlementGatedEntitlementCheckResultPosted {
	return &IEntitlementGatedEntitlementCheckResultPosted{
		TransactionId: devEvent.TransactionId,
		Result:        devEvent.Result,
		Raw:           devEvent.Raw,
	}
}
