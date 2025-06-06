package rules

import (
	"fmt"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

/** shared code for the rule builders */

type DerivedEvent struct {
	Payload  IsStreamEvent_Payload
	StreamId shared.StreamId
	Tags     *Tags
}

func unknownPayloadType(payload any) error {
	return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown payload type %T", payload))
}

func unknownContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown content type %T", content))
}

func invalidContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("invalid contemt type %T", content))
}

func isPastExpiry(currentTime time.Time, expiryEpochMs int64) bool {
	expiryTime := time.Unix(expiryEpochMs/1000, (expiryEpochMs%1000)*1000000)
	return !currentTime.Before(expiryTime)
}
