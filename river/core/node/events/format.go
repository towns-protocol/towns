package events

import (
	"strings"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
)

func FormatEventShort(e *ParsedEvent) string {
	var sb strings.Builder
	sb.Grow(100)
	FormatHashFromBytesToSB(&sb, e.Hash.Bytes())
	sb.WriteByte(' ')
	FormatHashFromBytesToSB(&sb, e.Event.PrevMiniblockHash)
	return sb.String()
}

func FormatHashShort(hash common.Hash) string {
	var sb strings.Builder
	sb.Grow(100)
	FormatHashFromBytesToSB(&sb, hash[:])
	return sb.String()
}
