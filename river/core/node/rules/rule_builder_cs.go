package rules

import (
	"github.com/towns-protocol/towns/core/node/auth"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type CreateStreamRules struct {
	CreatorStreamId shared.StreamId
	// user ids that must have valid user streams before creating the stream
	RequiredUserAddrs [][]byte
	// stream ids that the creator must be a member of to create the stream
	RequiredMemberships [][]byte
	// on chain requirements for creating the stream
	ChainAuth *auth.ChainAuthArgs
	// DerivedEvents: events that should be added after the stream is created
	// derived events events must always be replayable - meaning that in the case of a no-op, the can_add_event
	// function should return false, nil, nil, nil to indicate
	// that the event cannot be added to the stream, but there is no error
	DerivedEvents []*DerivedEvent
}

type ruleBuilderCS interface {
	check(fn ...func() error) ruleBuilderCS
	checkOneOf(fns ...func() error) ruleBuilderCS
	requireUserAddr(userAddresses ...[]byte) ruleBuilderCS
	requireMembership(streamIds ...[]byte) ruleBuilderCS
	requireChainAuth(f func() (*auth.ChainAuthArgs, error)) ruleBuilderCS
	requireDerivedEvent(f ...func() (*DerivedEvent, error)) ruleBuilderCS
	requireDerivedEvents(f func() ([]*DerivedEvent, error)) ruleBuilderCS
	fail(err error) ruleBuilderCS
	run() (*CreateStreamRules, error)
}

type ruleBuilderCSImpl struct {
	failErr             error
	creatorStreamId     shared.StreamId
	requiredUserAddrs   [][]byte
	requiredMemberships [][]byte
	checks              [][]func() error
	chainAuth           func() (*auth.ChainAuthArgs, error)
	derivedEvents       []func() (*DerivedEvent, error)
	derivedEventSlices  []func() ([]*DerivedEvent, error)
}

func csBuilder(creatorStreamId shared.StreamId) ruleBuilderCS {
	return &ruleBuilderCSImpl{
		creatorStreamId:     creatorStreamId,
		failErr:             nil,
		checks:              nil,
		requiredUserAddrs:   nil,
		requiredMemberships: nil,
		chainAuth: func() (*auth.ChainAuthArgs, error) {
			return nil, nil
		},
		derivedEvents: nil,
	}
}

func (re *ruleBuilderCSImpl) check(fns ...func() error) ruleBuilderCS {
	for _, fn := range fns {
		re.checkOneOf(fn)
	}
	return re
}

func (re *ruleBuilderCSImpl) checkOneOf(fns ...func() error) ruleBuilderCS {
	re.checks = append(re.checks, fns)
	return re
}

func (re *ruleBuilderCSImpl) requireUserAddr(userAddresses ...[]byte) ruleBuilderCS {
	re.requiredUserAddrs = append(re.requiredUserAddrs, userAddresses...)
	return re
}

func (re *ruleBuilderCSImpl) requireMembership(streamIds ...[]byte) ruleBuilderCS {
	for _, streamId := range streamIds {
		if streamId != nil {
			re.requiredMemberships = append(re.requiredMemberships, streamId)
		}
	}
	return re
}

func (re *ruleBuilderCSImpl) requireChainAuth(f func() (*auth.ChainAuthArgs, error)) ruleBuilderCS {
	re.chainAuth = f
	return re
}

func (re *ruleBuilderCSImpl) requireDerivedEvent(f ...func() (*DerivedEvent, error)) ruleBuilderCS {
	re.derivedEvents = f
	return re
}

func (re *ruleBuilderCSImpl) requireDerivedEvents(f func() ([]*DerivedEvent, error)) ruleBuilderCS {
	re.derivedEventSlices = append(re.derivedEventSlices, f)
	return re
}

func (re *ruleBuilderCSImpl) fail(err error) ruleBuilderCS {
	re.failErr = err
	return re
}

func runChecksCS(checksList [][]func() error) error {
	// outer loop is an and
	for _, errFns := range checksList {
		// inner loop is an or
		var errorMsgs []string
		for _, fn := range errFns {
			err := fn()
			if err != nil {
				errorMsgs = append(errorMsgs, err.Error())
			}
		}
		if len(errorMsgs) == 1 {
			return RiverError(Err_PERMISSION_DENIED, "check failed", "reason", errorMsgs[0])
		} else if len(errorMsgs) > 1 {
			return RiverError(Err_PERMISSION_DENIED, "checkOneOf failed", "reasons", errorMsgs)
		}
	}
	return nil
}

func runDerivedEvents(
	fns1 []func() (*DerivedEvent, error),
	fns2 []func() ([]*DerivedEvent, error),
) ([]*DerivedEvent, error) {
	var derivedEvents []*DerivedEvent
	for _, fn := range fns1 {
		derivedEvent, err := fn()
		if err != nil {
			return nil, err
		}
		derivedEvents = append(derivedEvents, derivedEvent)
	}

	for _, fn := range fns2 {
		derivedEventSlice, err := fn()
		if err != nil {
			return nil, err
		}
		derivedEvents = append(derivedEvents, derivedEventSlice...)
	}
	return derivedEvents, nil
}

func (re *ruleBuilderCSImpl) run() (*CreateStreamRules, error) {
	if re.failErr != nil {
		return nil, re.failErr
	}

	err := runChecksCS(re.checks)
	if err != nil {
		return nil, err
	}
	chainAuthArgs, err := re.chainAuth()
	if err != nil {
		return nil, err
	}
	derivedEvents, err := runDerivedEvents(re.derivedEvents, re.derivedEventSlices)
	if err != nil {
		return nil, err
	}
	if len(re.checks) == 0 && chainAuthArgs == nil && derivedEvents == nil {
		return nil, RiverError(Err_INTERNAL, "no checks or requirements")
	}
	return &CreateStreamRules{
		CreatorStreamId:     re.creatorStreamId,
		RequiredUserAddrs:   re.requiredUserAddrs,
		RequiredMemberships: re.requiredMemberships,
		ChainAuth:           chainAuthArgs,
		DerivedEvents:       derivedEvents,
	}, nil
}
