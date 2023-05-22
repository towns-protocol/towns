package base

import "strings"

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
