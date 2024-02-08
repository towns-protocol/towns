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

type ruleBuilder interface {
	check(f func() (bool, error)) ruleBuilder
	checkOneOf(f ...func() (bool, error)) ruleBuilder
	requireChainAuth(f func() (*auth.ChainAuthArgs, error)) ruleBuilder
	requireParentEvent(f func() (*RequiredParentEvent, error)) ruleBuilder
	fail(err error) ruleBuilder
	run() (bool, *auth.ChainAuthArgs, *RequiredParentEvent, error)
}

type ruleBuilderImpl struct {
	err       error
	checks    [][]func() (bool, error)
	chainAuth func() (*auth.ChainAuthArgs, error)
	requires  func() (*RequiredParentEvent, error)
}

func builder() ruleBuilder {
	return &ruleBuilderImpl{
		err:    nil,
		checks: nil,
		chainAuth: func() (*auth.ChainAuthArgs, error) {
			return nil, nil
		},
		requires: func() (*RequiredParentEvent, error) {
			return nil, nil
		},
	}
}

func (re *ruleBuilderImpl) check(f func() (bool, error)) ruleBuilder {
	return re.checkOneOf(f)
}

func (re *ruleBuilderImpl) checkOneOf(f ...func() (bool, error)) ruleBuilder {
	re.checks = append(re.checks, f)
	return re
}

func (re *ruleBuilderImpl) requireChainAuth(f func() (*auth.ChainAuthArgs, error)) ruleBuilder {
	re.chainAuth = f
	return re
}

func (re *ruleBuilderImpl) requireParentEvent(f func() (*RequiredParentEvent, error)) ruleBuilder {
	re.requires = f
	return re
}

func (re *ruleBuilderImpl) fail(err error) ruleBuilder {
	re.err = err
	return re
}

func (re *ruleBuilderImpl) run() (bool, *auth.ChainAuthArgs, *RequiredParentEvent, error) {
	if re.err != nil {
		return false, nil, nil, re.err
	}
	// outer loop is an and
	for _, checks := range re.checks {
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
				return false, nil, nil, nil
			} else if len(errorMsgs) == 1 {
				return false, nil, nil, RiverError(Err_PERMISSION_DENIED, "check failed", "reason", errorMsgs[0])
			} else {
				return false, nil, nil, RiverError(Err_PERMISSION_DENIED, "checkOneOf failed", "reasons", errorMsgs)
			}
		}
	}

	chainAuthArgs, err := re.chainAuth()
	if err != nil {
		return false, nil, nil, err
	}
	requiredParentEvent, err := re.requires()
	if err != nil {
		return false, nil, nil, err
	}
	if len(re.checks) == 0 && chainAuthArgs == nil && requiredParentEvent == nil {
		return false, nil, nil, RiverError(Err_INTERNAL, "no checks or requirements")
	}
	return true, chainAuthArgs, requiredParentEvent, nil
}
