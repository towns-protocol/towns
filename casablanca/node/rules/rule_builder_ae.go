package rules

import (
	"github.com/river-build/river/auth"
	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
)

type RequiredParentEvent struct {
	Payload  IsStreamEvent_Payload
	StreamId string
}

type ruleBuilderAE interface {
	check(f func() (bool, error)) ruleBuilderAE
	checkOneOf(f ...func() (bool, error)) ruleBuilderAE
	requireChainAuth(f func() (*auth.ChainAuthArgs, error)) ruleBuilderAE
	requireParentEvent(f func() (*RequiredParentEvent, error)) ruleBuilderAE
	fail(err error) ruleBuilderAE
	run() (bool, *auth.ChainAuthArgs, *RequiredParentEvent, error)
}

type ruleBuilderAEImpl struct {
	failErr     error
	checks      [][]func() (bool, error)
	chainAuth   func() (*auth.ChainAuthArgs, error)
	parentEvent func() (*RequiredParentEvent, error)
}

func aeBuilder() ruleBuilderAE {
	return &ruleBuilderAEImpl{
		failErr: nil,
		checks:  nil,
		chainAuth: func() (*auth.ChainAuthArgs, error) {
			return nil, nil
		},
		parentEvent: func() (*RequiredParentEvent, error) {
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

func (re *ruleBuilderAEImpl) requireChainAuth(f func() (*auth.ChainAuthArgs, error)) ruleBuilderAE {
	re.chainAuth = f
	return re
}

func (re *ruleBuilderAEImpl) requireParentEvent(f func() (*RequiredParentEvent, error)) ruleBuilderAE {
	re.parentEvent = f
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
		var foundCanAdd = false
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

func (re *ruleBuilderAEImpl) run() (bool, *auth.ChainAuthArgs, *RequiredParentEvent, error) {
	if re.failErr != nil {
		return false, nil, nil, re.failErr
	}

	canAdd, err := runChecksAE(re.checks)
	if err != nil || !canAdd {
		return false, nil, nil, err
	}
	chainAuthArgs, err := re.chainAuth()
	if err != nil {
		return false, nil, nil, err
	}
	requiredParentEvent, err := re.parentEvent()
	if err != nil {
		return false, nil, nil, err
	}
	if len(re.checks) == 0 && chainAuthArgs == nil && requiredParentEvent == nil {
		return false, nil, nil, RiverError(Err_INTERNAL, "no checks or requirements")
	}
	return true, chainAuthArgs, requiredParentEvent, nil
}
