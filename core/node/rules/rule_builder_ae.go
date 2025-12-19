package rules

import (
	"github.com/towns-protocol/towns/core/node/auth"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type AddEventSideEffects struct {
	// RequiredParentEvent: event that must exist in the stream before the event can be added
	// required parent events must be replayable - meaning that in the case of a no-op, the can_add_event function
	// should return false, nil, nil, nil to indicate
	// that the event cannot be added to the stream, but there is no error
	RequiredParentEvent *DerivedEvent
	// OnChainAuthFailure: event that should be added to the stream if the chain auth check fails entitlement checks
	OnChainAuthFailure *DerivedEvent
}

type AddEventVerifications struct {
	Receipt         *BlockchainTransactionReceipt
	OneOfChainAuths []*auth.ChainAuthArgs
}

type (
	chainAuthFunc func() (*auth.ChainAuthArgs, error)
	ruleBuilderAE interface {
		check(f func() (bool, error)) ruleBuilderAE
		checkOneOf(f ...func() (bool, error)) ruleBuilderAE
		requireChainAuth(f chainAuthFunc) ruleBuilderAE
		requireOneOfChainAuths(f ...chainAuthFunc) ruleBuilderAE
		requireParentEvent(f func() (*DerivedEvent, error)) ruleBuilderAE
		onChainAuthFailure(f func() (*DerivedEvent, error)) ruleBuilderAE
		verifyReceipt(f func() (*BlockchainTransactionReceipt, error)) ruleBuilderAE
		fail(err error) ruleBuilderAE
		run() (bool, *AddEventVerifications, *AddEventSideEffects, error)
	}
)

type (
	ruleBuilderAEImpl struct {
		failErr          error
		checks           [][]func() (bool, error)
		chainAuths       []chainAuthFunc
		parentEvent      func() (*DerivedEvent, error)
		chainAuthFailure func() (*DerivedEvent, error)
		receipt          func() (*BlockchainTransactionReceipt, error)
	}
)

func aeBuilder() ruleBuilderAE {
	return &ruleBuilderAEImpl{
		failErr:    nil,
		checks:     nil,
		chainAuths: []chainAuthFunc{},
		parentEvent: func() (*DerivedEvent, error) {
			return nil, nil
		},
		chainAuthFailure: func() (*DerivedEvent, error) {
			return nil, nil
		},
		receipt: func() (*BlockchainTransactionReceipt, error) {
			return nil, nil
		},
	}
}

func (re *ruleBuilderAEImpl) check(f func() (bool, error)) ruleBuilderAE {
	return re.checkOneOf(f)
}

func (re *ruleBuilderAEImpl) checkOneOf(f ...func() (bool, error)) ruleBuilderAE {
	re.checks = append(re.checks, f)
	return re
}

func (re *ruleBuilderAEImpl) requireChainAuth(f chainAuthFunc) ruleBuilderAE {
	return re.requireOneOfChainAuths(f)
}

func (re *ruleBuilderAEImpl) requireOneOfChainAuths(f ...chainAuthFunc) ruleBuilderAE {
	re.chainAuths = append(re.chainAuths, f...)
	return re
}

func (re *ruleBuilderAEImpl) requireParentEvent(f func() (*DerivedEvent, error)) ruleBuilderAE {
	re.parentEvent = f
	return re
}

func (re *ruleBuilderAEImpl) verifyReceipt(f func() (*BlockchainTransactionReceipt, error)) ruleBuilderAE {
	re.receipt = f
	return re
}

func (re *ruleBuilderAEImpl) onChainAuthFailure(f func() (*DerivedEvent, error)) ruleBuilderAE {
	re.chainAuthFailure = f
	return re
}

func (re *ruleBuilderAEImpl) fail(err error) ruleBuilderAE {
	re.failErr = err
	return re
}

func runChecksAE(checksList [][]func() (bool, error)) (bool, error) {
	// outer loop is an and
	for _, checks := range checksList {
		// inner loop is an or
		foundCanAdd := false
		var errorMsgs []string
		for _, check := range checks {
			canAdd, err := check()
			if err != nil {
				errorMsgs = append(errorMsgs, err.Error())
			} else if canAdd {
				foundCanAdd = true
				break
			}
		}
		if !foundCanAdd {
			if len(errorMsgs) == 0 {
				return false, nil
			} else if len(errorMsgs) == 1 {
				return false, RiverError(Err_PERMISSION_DENIED, "check failed", "reason", errorMsgs[0])
			} else {
				return false, RiverError(Err_PERMISSION_DENIED, "checkOneOf failed", "reasons", errorMsgs)
			}
		}
	}
	return true, nil
}

func (re *ruleBuilderAEImpl) run() (bool, *AddEventVerifications, *AddEventSideEffects, error) {
	if re.failErr != nil {
		return false, nil, nil, re.failErr
	}

	canAdd, err := runChecksAE(re.checks)
	if err != nil || !canAdd {
		return false, nil, nil, err
	}
	chainAuthArgsList := make([]*auth.ChainAuthArgs, 0, len(re.chainAuths))
	for _, chainAuth := range re.chainAuths {
		chainAuthArgs, err := chainAuth()
		if err != nil {
			return false, nil, nil, err
		}
		if chainAuthArgs != nil {
			chainAuthArgsList = append(chainAuthArgsList, chainAuthArgs)
		}
	}
	requiredParentEvent, err := re.parentEvent()
	if err != nil {
		return false, nil, nil, err
	}
	onEntitlementFailure, err := re.chainAuthFailure()
	if err != nil {
		return false, nil, nil, err
	}
	receipt, err := re.receipt()
	if err != nil {
		return false, nil, nil, err
	}
	if len(re.checks) == 0 && len(re.chainAuths) == 0 && requiredParentEvent == nil {
		return false, nil, nil, RiverError(Err_INTERNAL, "no checks or requirements")
	}
	sideEffects := &AddEventSideEffects{
		RequiredParentEvent: requiredParentEvent,
		OnChainAuthFailure:  onEntitlementFailure,
	}
	verifications := &AddEventVerifications{
		Receipt:         receipt,
		OneOfChainAuths: chainAuthArgsList,
	}
	return true, verifications, sideEffects, nil
}
