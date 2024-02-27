package rules

import (
	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
)

/** shared code for the rule builders */

func unknownPayloadType(payload any) error {
	return RiverError(Err_INVALID_ARGUMENT, "unknown payload type %T", payload)
}

func unknownContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, "unknown content type %T", content)
}

func invalidContentType(content any) error {
	return RiverError(Err_INVALID_ARGUMENT, "invalid contemt type %T", content)
}
