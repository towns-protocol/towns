package base

import (
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/protocol"
)

const (
	hextable = "0123456789abcdef"
)

func encodeHexFromBytes(dst *strings.Builder, src []byte) {
	for _, v := range src {
		dst.WriteByte(hextable[v>>4])
		dst.WriteByte(hextable[v&0x0f])
	}
}

func encodeHexFromString(dst *strings.Builder, src string) {
	for i := 0; i < len(src); i++ {
		v := src[i]
		dst.WriteByte(hextable[v>>4])
		dst.WriteByte(hextable[v&0x0f])
	}
}

// TODO: rename to FormatShortHashXXX
func FormatHashFromBytesToSB(dst *strings.Builder, src []byte) {
	if len(src) <= 5 {
		encodeHexFromBytes(dst, src)
	} else {
		encodeHexFromBytes(dst, src[:2])
		dst.WriteByte('.')
		dst.WriteByte('.')
		encodeHexFromBytes(dst, src[len(src)-2:])
	}
}

func FormatHashFromStringToSB(dst *strings.Builder, src string) {
	if len(src) <= 5 {
		encodeHexFromString(dst, src)
	} else {
		encodeHexFromString(dst, src[:2])
		dst.WriteByte('.')
		dst.WriteByte('.')
		encodeHexFromString(dst, src[len(src)-2:])
	}
}

func FormatHash(h common.Hash) string {
	return FormatHashFromBytes(h[:])
}

func FormatHashFromBytes(src []byte) string {
	var dst strings.Builder
	dst.Grow(10)
	FormatHashFromBytesToSB(&dst, src)
	return dst.String()
}

func FormatHashFromString(src string) string {
	var dst strings.Builder
	dst.Grow(10)
	FormatHashFromStringToSB(&dst, src)
	return dst.String()
}

func FormatEnvelopeHashes(envelopes []*protocol.Envelope) string {
	var dst strings.Builder
	dst.Grow(11 * len(envelopes))
	for i, e := range envelopes {
		if i > 0 {
			dst.WriteByte(' ')
		}
		FormatHashFromBytesToSB(&dst, e.Hash)
	}
	return dst.String()
}

func FormatFullHashFromBytesToSB(dst *strings.Builder, src []byte) {
	encodeHexFromBytes(dst, src)
}

func FormatFullHashFromStringToSB(dst *strings.Builder, src string) {
	encodeHexFromString(dst, src)
}

func FormatFullHash(h common.Hash) string {
	return FormatFullHashFromBytes(h[:])
}

func FormatFullHashFromBytes(src []byte) string {
	var dst strings.Builder
	dst.Grow(64)
	FormatFullHashFromBytesToSB(&dst, src)
	return dst.String()
}

func FormatFullHashFromString(src string) string {
	var dst strings.Builder
	dst.Grow(64)
	FormatFullHashFromStringToSB(&dst, src)
	return dst.String()
}
