package rules

import (
	"time"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

/** shared code for the rule builders */

type DerivedEvent struct {
	Payload  IsStreamEvent_Payload
	StreamId shared.StreamId
}

func unknownPayloadType(payload any) error {
	return RiverError(Err_INVALID_ARGUMENT, "unknown payload type %T", payload)
}

func unknownContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, "unknown content type %T", content)
}

func invalidContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, "invalid contemt type %T", content)
}

func isPastExpiry(currentTime time.Time, expiryEpochMs int64) bool {
	expiryTime := time.Unix(expiryEpochMs/1000, (expiryEpochMs%1000)*1000000)
	return !currentTime.Before(expiryTime)
}
