package dlog

import (
	"encoding/hex"
	"fmt"
	"io"
	"reflect"
	"strconv"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/kr/text"
	"github.com/rogpeppe/go-internal/fmtsort"
)

const (
	reverseHexTable = "" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\xff\xff\xff\xff\xff\xff" +
		"\xff\x0a\x0b\x0c\x0d\x0e\x0f\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\x0a\x0b\x0c\x0d\x0e\x0f\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff" +
		"\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff\xff"
)

// IsHexString reports whether s consists of hexadecimal digits and whether it has 0x prefix.
func IsHexString(s string) (bool, bool) {
	if len(s) < 2 || (len(s)&1) != 0 {
		return false, false
	}

	start := 0
	prefix := false
	if s[0] == '0' && (s[1] == 'x' || s[1] == 'X') {
		start = 2
		prefix = true
	}

	for i := start; i < len(s); i++ {
		if reverseHexTable[s[i]] > 0x0f {
			return false, prefix
		}
	}
	return true, prefix
}

type FormatOpts struct {
	Quote           bool
	InitialIndent   int
	SkipNilAndEmpty bool
	ShortHex        bool
	PrintType       bool
	Colors          ColorMap
}

func Format(writer io.Writer, v reflect.Value, opts FormatOpts) {
	if opts.Colors == nil {
		opts.Colors = ColorMap_Default
	}
	tw := tabwriter.NewWriter(writer, 4, 4, 1, ' ', 0)
	var w io.Writer
	if opts.InitialIndent == 0 {
		w = tw
	} else {
		ind := make([]byte, opts.InitialIndent)
		for i := 0; i < opts.InitialIndent; i++ {
			ind[i] = '\t'
		}
		w = text.NewIndentWriter(tw, ind)
	}
	p := &printer{
		Writer:  w,
		tw:      tw,
		visited: make(map[visit]int),
		opts:    &opts,
	}
	p.printValue(v, opts.PrintType, opts.Quote, false)
	tw.Flush()
}

// Implement for custom formatting, first message is printed, then any tag pairs.
type TaggedObject interface {
	Message() string
	ForEachTag(func(name string, value any) bool)
}

type printer struct {
	io.Writer
	tw      *tabwriter.Writer
	visited map[visit]int
	depth   int
	opts    *FormatOpts
}

func (p *printer) indent() *printer {
	q := *p
	q.tw = tabwriter.NewWriter(p.Writer, 4, 4, 1, ' ', 0)
	q.Writer = text.NewIndentWriter(q.tw, []byte{'\t'})
	return &q
}

func (p *printer) writeString(s string) {
	_, _ = io.WriteString(p, s)
}

func (p *printer) printInline(v reflect.Value, x any, showType bool, color []byte) {
	OpenColor(p.Writer, color)
	if showType {
		p.writeString(v.Type().String())
		fmt.Fprintf(p, "(%#v)", x)
	} else {
		fmt.Fprintf(p, "%#v", x)
	}
	CloseColor(p.Writer, color)
}

func (p *printer) printIntInline(v reflect.Value, x any, showType bool, color []byte) {
	OpenColor(p.Writer, color)
	if showType {
		p.writeString(v.Type().String())
		fmt.Fprintf(p, "(%d)", x)
	} else {
		fmt.Fprintf(p, "%d", x)
	}
	CloseColor(p.Writer, color)
}

// printValue must keep track of already-printed pointer values to avoid
// infinite recursion.
type visit struct {
	v   uintptr
	typ reflect.Type
}

func (p *printer) catchPanic(v reflect.Value, method string) {
	if r := recover(); r != nil {
		if v.Kind() == reflect.Ptr && v.IsNil() {
			writeByte(p, '(')
			p.writeString(v.Type().String())
			const vsCodeEditorColoringBugWorkaround = ")(nil)"
			p.writeString(vsCodeEditorColoringBugWorkaround)
			return
		}
		writeByte(p, '(')
		p.writeString(v.Type().String())
		p.writeString(")(PANIC=calling method ")
		p.writeString(strconv.Quote(method))
		p.writeString(": ")
		fmt.Fprint(p, r)
		writeByte(p, ')')
	}
}

var (
	durationType     = reflect.TypeOf(time.Duration(0))
	errorType        = reflect.TypeOf((*error)(nil)).Elem()
	taggedObjectType = reflect.TypeOf((*TaggedObject)(nil)).Elem()
	goStringerType   = reflect.TypeOf((*fmt.GoStringer)(nil)).Elem()
)

func (p *printer) printValue(v reflect.Value, showType, quote bool, key bool) {
	if p.depth > 10 {
		p.writeString("!%v(DEPTH EXCEEDED)")
		return
	}

	if v.IsValid() && v.CanInterface() && v.Type().Implements(goStringerType) {
		i := v.Interface()
		if goStringer, ok := i.(fmt.GoStringer); ok {
			defer p.catchPanic(v, "GoString")
			p.writeString(goStringer.GoString())
			return
		}
	}

	switch v.Kind() {
	case reflect.Bool:
		var boolColor []byte
		if v.Bool() {
			boolColor = p.opts.Colors[ColorMap_BoolTrue]
		} else {
			boolColor = p.opts.Colors[ColorMap_BoolFalse]
		}
		p.printInline(v, v.Bool(), showType, boolColor)

	case reflect.Int64:
		if v.Type() != durationType {
			p.printIntInline(v, v.Int(), showType, p.opts.Colors[ColorMap_Int])
		} else {
			p.fmtString(v.Interface().(time.Duration).String(), false, false)
		}

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32:
		p.printIntInline(v, v.Int(), showType, p.opts.Colors[ColorMap_Int])

	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		p.printIntInline(v, v.Uint(), showType, p.opts.Colors[ColorMap_Int])

	case reflect.Uintptr:
		p.printInline(v, v.Uint(), showType, p.opts.Colors[ColorMap_Int])

	case reflect.Float32, reflect.Float64:
		p.printInline(v, v.Float(), showType, p.opts.Colors[ColorMap_Float])

	case reflect.Complex64, reflect.Complex128:
		fmt.Fprintf(p, "%#v", v.Complex())

	case reflect.String:
		p.fmtString(v.String(), quote, key)

	case reflect.Map:
		p.printMap(v, showType)

	case reflect.Struct:
		p.printStruct(v, showType)

	case reflect.Interface:
		if v.Type().Implements(errorType) {
			p.printError(v.Interface().(error))
		} else {
			switch e := v.Elem(); {
			case e.Kind() == reflect.Invalid:
				p.printNil("")
			case e.IsValid():
				pp := *p
				pp.depth++
				pp.printValue(e, showType, true, key)
			default:
				p.printNil(v.Type().String())
			}
		}

	case reflect.Array, reflect.Slice:
		p.printArray(v, showType)

	case reflect.Ptr:
		if v.Type().Implements(errorType) {
			p.printError(v.Interface().(error))
		} else {
			e := v.Elem()
			if !e.IsValid() {
				p.printNil(v.Type().String())
			} else {
				pp := *p
				pp.depth++
				pp.printValue(e, p.opts.PrintType, true, key)
			}
		}

	case reflect.Chan:
		x := v.Pointer()
		if showType {
			writeByte(p, '(')
			p.writeString(v.Type().String())
			fmt.Fprintf(p, ")(%#v)", x)
		} else {
			fmt.Fprintf(p, "%#v", x)
		}

	case reflect.Func:
		p.writeString(v.Type().String())
		p.writeString(" {...}")

	case reflect.UnsafePointer:
		p.printInline(v, v.Pointer(), showType, DisableColor)

	case reflect.Invalid:
		p.printNil("")
	}
}

func (p *printer) printError(err error) {
	if tagged, ok := err.(TaggedObject); ok {
		p.printTagged(tagged, ColorMap_ErrorText)
		return
	}

	str := err.Error()
	if str == "" {
		str = "(empty error)"
	}
	OpenColor(p.Writer, p.opts.Colors[ColorMap_ErrorText])
	p.writeString(str)
	CloseColor(p.Writer, p.opts.Colors[ColorMap_ErrorText])
}

func (p *printer) printNil(t string) {
	OpenColor(p.Writer, p.opts.Colors[ColorMap_Nil])
	if t != "" {
		writeByte(p, '(')
		p.writeString(t)
		writeByte(p, ')')
	}
	p.writeString("nil")
	CloseColor(p.Writer, p.opts.Colors[ColorMap_Nil])
}

const (
	shortenHexBytes        = 20
	shortenHexBytesPartLen = shortenHexBytes/2 - 1
	shortenHexChars        = shortenHexBytes * 2
	shortenHexCharsPartLen = shortenHexChars/2 - 2
)

func writeHexBytes(w io.Writer, src []byte) {
	dst := make([]byte, len(src)*2)
	hex.Encode(dst, src)
	_, _ = w.Write(dst)
}

func writeShortHexBytes(w io.Writer, src []byte) {
	if len(src) <= shortenHexBytes {
		writeHexBytes(w, src)
	} else {
		dst := make([]byte, hex.EncodedLen(shortenHexBytesPartLen))
		hex.Encode(dst, src[:shortenHexBytesPartLen])
		_, _ = w.Write(dst)
		_, _ = w.Write([]byte(".."))
		hex.Encode(dst, src[len(src)-shortenHexBytesPartLen:])
		_, _ = w.Write(dst)
	}
}

func getBytes(v reflect.Value) []byte {
	if v.Kind() == reflect.Array && !v.CanAddr() {
		ret := make([]byte, v.Len())
		for i := 0; i < v.Len(); i++ {
			b, ok := v.Index(i).Interface().(byte)
			if ok {
				ret[i] = b
			} else {
				return []byte{0xBA, 0xD0, 0xBA, 0xD0}
			}
		}
		return ret
	}
	return v.Bytes()
}

func (p *printer) printArray(v reflect.Value, showType bool) {
	t := v.Type()

	if v.Kind() == reflect.Slice && v.IsNil() {
		if showType {
			p.printNil(t.String())
		} else {
			p.printNil("")
		}
		return
	}

	if showType {
		p.writeString(t.String())
	}

	// v.CanAddr()
	if t.Elem().Kind() == reflect.Uint8 {
		OpenColor(p.Writer, p.opts.Colors[ColorMap_Hex])
		b := getBytes(v)
		if p.opts.ShortHex {
			writeShortHexBytes(p, b)
		} else {
			writeHexBytes(p, b)
		}
		CloseColor(p.Writer, p.opts.Colors[ColorMap_Hex])
		return
	}

	OpenColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	writeByte(p, '[')
	CloseColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	expand := !canInline(v.Type())
	pp := p
	if expand {
		writeByte(p, '\n')
		pp = p.indent()
	}
	for i := 0; i < v.Len(); i++ {
		showTypeInSlice := t.Elem().Kind() == reflect.Interface
		pp.printValue(v.Index(i), showTypeInSlice, true, false)
		if expand {
			pp.writeString(",\n")
		} else if i < v.Len()-1 {
			pp.writeString(", ")
		}
	}
	if expand {
		pp.tw.Flush()
	}
	OpenColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	writeByte(p, ']')
	CloseColor(p.Writer, p.opts.Colors[ColorMap_Brace])
}

func (p *printer) printTagged(v TaggedObject, msgColorNum int) {
	if v == nil {
		p.printNil("")
		return
	}

	OpenColor(p.Writer, p.opts.Colors[msgColorNum])
	p.writeString(v.Message())
	CloseColor(p.Writer, p.opts.Colors[msgColorNum])

	expand := !canInlineTagged(v)
	pp := p
	if expand {
		writeByte(p, '\n')
		pp = p.indent()
	} else {
		pp.writeString("; ")
	}
	prevPrinted := false
	v.ForEachTag(func(name string, val any) bool {
		tp := reflect.TypeOf(val)
		value := reflect.ValueOf(val)

		if p.opts.SkipNilAndEmpty && !Nonzero(value) && tp.Kind() != reflect.Bool {
			return true
		}

		if !expand && prevPrinted {
			pp.writeString(", ")
		}

		if name != "" {
			OpenColor(pp.Writer, p.opts.Colors[ColorMap_LogFieldKey])
			pp.writeString(name)
			CloseColor(pp.Writer, p.opts.Colors[ColorMap_LogFieldKey])
			pp.writeString(" = ")
		}
		pp.printValue(value, false, true, false)
		prevPrinted = true

		if expand {
			pp.writeString(",\n")
		}

		return true
	})
	if expand {
		pp.tw.Flush()
	}
}

func isProto(t reflect.Type) bool {
	f, ok := t.FieldByName("state")
	if !ok {
		return false
	}
	return strings.HasPrefix(f.Type.PkgPath(), "google.golang.org/protobuf")
}

func (p *printer) printStruct(v reflect.Value, showType bool) {
	t := v.Type()

	if v.CanAddr() {
		addr := v.UnsafeAddr()
		vis := visit{addr, t}
		if vd, ok := p.visited[vis]; ok && vd < p.depth {
			p.fmtString(t.String()+"{(CYCLIC REFERENCE)}", false, false)
			return // don't print v again
		}
		p.visited[vis] = p.depth
	}

	if t.Implements(errorType) {
		p.printError(v.Interface().(error))
		return
	}

	if t.Implements(taggedObjectType) {
		p.printTagged(v.Interface().(TaggedObject), ColorMap_Message)
		return
	}

	isProto := isProto(t)

	OpenColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	if showType {
		p.writeString(t.String())
	}
	writeByte(p, '{')
	CloseColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	if Nonzero(v) {
		expand := !canInline(v.Type())
		pp := p
		if expand {
			writeByte(p, '\n')
			pp = p.indent()
		}
		prevPrinted := false
		for i := 0; i < v.NumField(); i++ {
			field := t.Field(i)

			if isProto &&
				(field.Name == "sizeCache" ||
					field.Name == "unknownFields" ||
					field.Name == "state") {
				continue
			}

			value := getField(v, i)

			if p.opts.SkipNilAndEmpty && !Nonzero(value) && field.Type.Kind() != reflect.Bool {
				continue
			}

			if field.Tag.Get("dlog") == "omit" {
				continue
			}

			if !expand && prevPrinted {
				pp.writeString(", ")
			}

			showTypeInStruct := true
			if field.Name != "" {
				OpenColor(pp.Writer, p.opts.Colors[ColorMap_FieldName])
				pp.writeString(field.Name)
				CloseColor(pp.Writer, p.opts.Colors[ColorMap_FieldName])
				OpenColor(pp.Writer, p.opts.Colors[ColorMap_Colon])
				writeByte(pp, ':')
				CloseColor(pp.Writer, p.opts.Colors[ColorMap_Colon])
				if expand {
					writeByte(pp, '\t')
				}
				showTypeInStruct = labelType(field.Type)
			}
			pp.printValue(value, showTypeInStruct, true, false)
			prevPrinted = true

			if expand {
				pp.writeString(",\n")
			}
		}
		if expand {
			pp.tw.Flush()
		}
	}
	OpenColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	writeByte(p, '}')
	CloseColor(p.Writer, p.opts.Colors[ColorMap_Brace])
}

func (p *printer) printMap(v reflect.Value, showType bool) {
	OpenColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	t := v.Type()
	if showType {
		p.writeString(t.String())
	}
	writeByte(p, '{')
	CloseColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	if Nonzero(v) {
		expand := !canInline(v.Type())
		pp := p
		if expand {
			writeByte(p, '\n')
			pp = p.indent()
		}
		sm := fmtsort.Sort(v)
		for i := 0; i < v.Len(); i++ {
			k := sm.Key[i]
			mv := sm.Value[i]
			pp.printValue(k, false, true, true)
			OpenColor(pp.Writer, p.opts.Colors[ColorMap_Colon])
			writeByte(pp, ':')
			CloseColor(pp.Writer, p.opts.Colors[ColorMap_Colon])
			if expand {
				writeByte(pp, '\t')
			}
			showTypeInStruct := t.Elem().Kind() == reflect.Interface
			pp.printValue(mv, showTypeInStruct, true, false)
			if expand {
				pp.writeString(",\n")
			} else if i < v.Len()-1 {
				pp.writeString(", ")
			}
		}
		if expand {
			pp.tw.Flush()
		}
	}
	OpenColor(p.Writer, p.opts.Colors[ColorMap_Brace])
	writeByte(p, '}')
	CloseColor(p.Writer, p.opts.Colors[ColorMap_Brace])
}

func canInlineTagged(v TaggedObject) bool {
	ret := true
	v.ForEachTag(func(name string, value any) bool {
		r := unwrapInterface(reflect.ValueOf(value))
		if canExpand(r.Type()) {
			ret = false
			return false
		}
		return true
	})
	return ret
}

func canInline(t reflect.Type) bool {
	// nolint:exhaustive
	switch t.Kind() {
	case reflect.Map:
		// return !canExpand(t.Elem())
		return false
	case reflect.Struct:
		for i := 0; i < t.NumField(); i++ {
			if canExpand(t.Field(i).Type) {
				return false
			}
		}
		return true
	case reflect.Interface:
		return false
	case reflect.Array, reflect.Slice:
		return !canExpand(t.Elem())
	case reflect.Ptr:
		return false
	case reflect.Chan, reflect.Func, reflect.UnsafePointer:
		return false
	default:
		return true
	}
}

func canExpand(t reflect.Type) bool {
	// nolint:exhaustive
	switch t.Kind() {
	case reflect.Map, reflect.Struct,
		reflect.Interface, reflect.Array, reflect.Slice,
		reflect.Ptr:
		return true
	default:
		return false
	}
}

func labelType(t reflect.Type) bool {
	// nolint:exhaustive
	switch t.Kind() {
	case reflect.Interface, reflect.Struct:
		return true
	default:
		return false
	}
}

func (p *printer) fmtString(s string, quote bool, key bool) {
	hex, hasPrefix := IsHexString(s)
	if hex {
		if p.opts.ShortHex {
			if hasPrefix {
				if len(s) > (shortenHexChars + 2) {
					s = s[:(2+shortenHexCharsPartLen)] + ".." + s[len(s)-shortenHexCharsPartLen:]
				}
			} else {
				if len(s) > shortenHexChars {
					s = s[:shortenHexCharsPartLen] + ".." + s[len(s)-shortenHexCharsPartLen:]
				}
			}
		}
	}

	var color []byte
	if key {
		color = p.opts.Colors[ColorMap_Key]
	} else if hex {
		color = p.opts.Colors[ColorMap_Hex]
	} else {
		color = p.opts.Colors[ColorMap_String]
	}

	if quote {
		s = strconv.Quote(s)
	}

	OpenColor(p.Writer, color)
	p.writeString(s)
	CloseColor(p.Writer, color)
}

func writeByte(w io.Writer, b byte) {
	_, _ = w.Write([]byte{b})
}

func getField(v reflect.Value, i int) reflect.Value {
	val := v.Field(i)
	if val.Kind() == reflect.Interface && !val.IsNil() {
		val = val.Elem()
	}
	return val
}

func unwrapInterface(v reflect.Value) reflect.Value {
	if v.Kind() == reflect.Interface && !v.IsNil() {
		return v.Elem()
	}
	return v
}
