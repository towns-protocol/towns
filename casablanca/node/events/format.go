package events

import (
	"strings"

	. "github.com/river-build/river/base"
)

func FormatEventShort(e *ParsedEvent) string {
	var sb strings.Builder
	sb.Grow(100)
	FormatHashFromBytesToSB(&sb, e.Hash)
	sb.WriteByte(' ')
	FormatHashFromBytesToSB(&sb, e.Event.PrevMiniblockHash)
	return sb.String()
}

func FormatHashShort(hash []byte) string {
	var sb strings.Builder
	sb.Grow(100)
	FormatHashFromBytesToSB(&sb, hash)
	return sb.String()
}
