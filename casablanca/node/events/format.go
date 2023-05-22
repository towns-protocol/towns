package events

import (
	"strings"

	. "casablanca/node/base"
)

func FormatEventShort(e *ParsedEvent) string {
	var sb strings.Builder
	sb.Grow(100)
	FormatHashFromBytesToSB(&sb, e.Hash)
	sb.WriteByte(' ')
	sb.WriteByte('[')
	for i, pe := range e.Event.PrevEvents {
		if i > 0 {
			sb.WriteByte(' ')
		}
		FormatHashFromBytesToSB(&sb, pe)
	}
	sb.WriteByte(']')

	return sb.String()
}
