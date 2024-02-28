package dlog

import (
	"io"
)

type ColorCode []byte

var (
	Escape             = []byte("\x1b")
	StartAttributes    = []byte("[")
	EndAttributes      = []byte("m")
	AttributeSeparator = []byte(";")
	SequencePrefix     = []byte("\x1b[")
	SequenceSuffix     = EndAttributes
	ResetSequence      = []byte("\x1b[0m")
)

// Base attributes
var (
	DisableColor ColorCode = []byte{}
	Reset        ColorCode = []byte("0")
	Bold         ColorCode = []byte("1")
	Faint        ColorCode = []byte("2")
	Italic       ColorCode = []byte("3")
	Underline    ColorCode = []byte("4")
	BlinkSlow    ColorCode = []byte("5")
	BlinkRapid   ColorCode = []byte("6")
	ReverseVideo ColorCode = []byte("7")
	Concealed    ColorCode = []byte("8")
	CrossedOut   ColorCode = []byte("9")
)

// Foreground text colors
var (
	FgBlack   ColorCode = []byte("30")
	FgRed     ColorCode = []byte("31")
	FgGreen   ColorCode = []byte("32")
	FgYellow  ColorCode = []byte("33")
	FgBlue    ColorCode = []byte("34")
	FgMagenta ColorCode = []byte("35")
	FgCyan    ColorCode = []byte("36")
	FgWhite   ColorCode = []byte("37")
)

// Foreground Hi-Intensity text colors
var (
	FgHiBlack   ColorCode = []byte("90")
	FgHiRed     ColorCode = []byte("91")
	FgHiGreen   ColorCode = []byte("92")
	FgHiYellow  ColorCode = []byte("93")
	FgHiBlue    ColorCode = []byte("94")
	FgHiMagenta ColorCode = []byte("95")
	FgHiCyan    ColorCode = []byte("96")
	FgHiWhite   ColorCode = []byte("97")
)

// Background text colors
var (
	BgBlack   ColorCode = []byte("40")
	BgRed     ColorCode = []byte("41")
	BgGreen   ColorCode = []byte("42")
	BgYellow  ColorCode = []byte("43")
	BgBlue    ColorCode = []byte("44")
	BgMagenta ColorCode = []byte("45")
	BgCyan    ColorCode = []byte("46")
	BgWhite   ColorCode = []byte("47")
)

// Background Hi-Intensity text colors
var (
	BgHiBlack   ColorCode = []byte("100")
	BgHiRed     ColorCode = []byte("101")
	BgHiGreen   ColorCode = []byte("102")
	BgHiYellow  ColorCode = []byte("103")
	BgHiBlue    ColorCode = []byte("104")
	BgHiMagenta ColorCode = []byte("105")
	BgHiCyan    ColorCode = []byte("106")
	BgHiWhite   ColorCode = []byte("107")
)

func OpenColor(w io.Writer, color ColorCode) {
	if len(color) == 0 {
		return
	}
	_, _ = w.Write(SequencePrefix)
	_, _ = w.Write(color)
	_, _ = w.Write(EndAttributes)
}

func CloseColor(w io.Writer, color ColorCode) {
	if len(color) == 0 {
		return
	}
	_, _ = w.Write(ResetSequence)
}
