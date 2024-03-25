// Copyright 2022 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package dlog

import (
	"context"
	"encoding"
	"fmt"
	"io"
	"log/slog"
	"reflect"
	"unicode"
	"unicode/utf8"
)

// PrettyTextHandler is a Handler that writes Records to an io.Writer as a
// sequence of key=value pairs separated by spaces and followed by a newline.
type PrettyTextHandler struct {
	*commonHandler
}

// NewPrettyTextHandler creates a PrettyTextHandler that writes to w,
// using the given options.
// If opts is nil, the default options are used.
func NewPrettyTextHandler(w io.Writer, opts *PrettyHandlerOptions) *PrettyTextHandler {
	if opts == nil {
		opts = &PrettyHandlerOptions{}
	}
	if opts.Colors == nil {
		opts.Colors = ColorMap_Default
	}
	return &PrettyTextHandler{
		&commonHandler{
			json: false,
			w:    w,
			opts: *opts,
		},
	}
}

// Enabled reports whether the handler handles records at the given level.
// The handler ignores records whose level is lower.
func (h *PrettyTextHandler) Enabled(_ context.Context, level slog.Level) bool {
	return h.commonHandler.enabled(level)
}

// WithAttrs returns a new PrettyTextHandler whose attributes consists
// of h's attributes followed by attrs.
func (h *PrettyTextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &PrettyTextHandler{commonHandler: h.commonHandler.withAttrs(attrs)}
}

func (h *PrettyTextHandler) WithGroup(name string) slog.Handler {
	return &PrettyTextHandler{commonHandler: h.commonHandler.withGroup(name)}
}

// Handle formats its argument Record as a single line of space-separated
// key=value items.
//
// If the Record's time is zero, the time is omitted.
// Otherwise, the key is "time"
// and the value is output in RFC3339 format with millisecond precision.
//
// If the Record's level is zero, the level is omitted.
// Otherwise, the key is "level"
// and the value of [Level.String] is output.
//
// If the AddSource option is set and source information is available,
// the key is "source" and the value is output as FILE:LINE.
//
// The message's key is "msg".
//
// To modify these or other attributes, or remove them from the output, use
// [HandlerOptions.ReplaceAttr].
//
// If a value implements [encoding.TextMarshaler], the result of MarshalText is
// written. Otherwise, the result of fmt.Sprint is written.
//
// Keys and values are quoted with [strconv.Quote] if they contain Unicode space
// characters, non-printing characters, '"' or '='.
//
// Keys inside groups consist of components (keys or group names) separated by
// dots. No further escaping is performed.
// Thus there is no way to determine from the key "a.b.c" whether there
// are two groups "a" and "b" and a key "c", or a single group "a.b" and a key "c",
// or single group "a" and a key "b.c".
// If it is necessary to reconstruct the group structure of a key
// even in the presence of dots inside components, use
// [HandlerOptions.ReplaceAttr] to encode that information in the key.
//
// Each call to Handle results in a single serialized call to
// io.Writer.Write.
func (h *PrettyTextHandler) Handle(_ context.Context, r slog.Record) error {
	return h.commonHandler.handle(r)
}

func appendTextAny(s *handleState, a any, inline bool) error {
	if tm, ok := a.(encoding.TextMarshaler); ok {
		data, err := tm.MarshalText()
		if err != nil {
			return err
		}
		s.appendString(string(data))
		return nil
	}

	// Print errors inline.
	if _, ok := a.(error); ok {
		inline = true
	}

	v := reflect.ValueOf(a)

	indent := 0
	_, isByteSlice := byteSlice(a)
	if !inline && !isByteSlice && Nonzero(v) {
		s.buf.WriteByte('\n')
		indent = 2
	}

	Format(s.buf, v, FormatOpts{
		Quote:           false,
		InitialIndent:   indent,
		SkipNilAndEmpty: true,
		ShortHex:        !s.h.opts.DisableShortHex,
		Colors:          s.h.opts.Colors,
	})
	return nil
}

func appendTextValue(s *handleState, v slog.Value) error {
	switch v.Kind() {
	case slog.KindString, slog.KindInt64, slog.KindUint64, slog.KindBool, slog.KindFloat64, slog.KindDuration:
		return appendTextAny(s, v.Any(), true)

	case slog.KindAny:
		return appendTextAny(s, v.Any(), false)

	case slog.KindTime:
		s.appendTime(v.Time())

	case slog.KindGroup:
		*s.buf = fmt.Append(*s.buf, v.Group())

	case slog.KindLogValuer:
		*s.buf = fmt.Append(*s.buf, v.LogValuer())

	default:
		panic(fmt.Sprintf("bad kind: %s", v.Kind()))
	}
	return nil
}

func levelColor(s *handleState, level slog.Level) ColorCode {
	if level >= slog.LevelError {
		return s.h.opts.Colors[ColorMap_Level_Error]
	} else if level >= slog.LevelWarn {
		return s.h.opts.Colors[ColorMap_Level_Warn]
	} else if level >= slog.LevelInfo {
		return s.h.opts.Colors[ColorMap_Level_Info]
	} else {
		return s.h.opts.Colors[ColorMap_Level_Debug]
	}
}

func appendTextBuiltIns(s *handleState, r slog.Record) {
	// level
	levelColor := levelColor(s, r.Level)
	OpenColor(s.buf, levelColor)
	s.appendString(r.Level.String()[:4])
	CloseColor(s.buf, levelColor)
	s.buf.WriteByte(' ')

	// time
	OpenColor(s.buf, s.h.opts.Colors[ColorMap_Time])
	if !r.Time.IsZero() {
		s.appendTime(r.Time)
		s.buf.WriteByte(' ')
	} else {
		s.buf.WriteString("00000 ")
	}
	CloseColor(s.buf, s.h.opts.Colors[ColorMap_Time])

	// TODO: source is not availabe for external package.
	// source
	// if h.opts.AddSource {
	// 	state.appendAttr(Any(SourceKey, r.source))
	// }

	// message
	OpenColor(s.buf, s.h.opts.Colors[ColorMap_Message])
	s.buf.WriteString(r.Message)
	CloseColor(s.buf, s.h.opts.Colors[ColorMap_Message])
}

// byteSlice returns its argument as a []byte if the argument's
// underlying type is []byte, along with a second return value of true.
// Otherwise it returns nil, false.
func byteSlice(a any) ([]byte, bool) {
	if bs, ok := a.([]byte); ok {
		return bs, true
	}
	// Like Printf's %s, we allow both the slice type and the byte element type to be named.
	t := reflect.TypeOf(a)
	if t != nil && t.Kind() == reflect.Slice && t.Elem().Kind() == reflect.Uint8 {
		return reflect.ValueOf(a).Bytes(), true
	}
	return nil, false
}

func needsQuoting(s string) bool {
	if len(s) == 0 {
		return true
	}
	for i := 0; i < len(s); {
		b := s[i]
		if b < utf8.RuneSelf {
			// Quote anything except a backslash that would need quoting in a
			// JSON string, as well as space and '='
			if b != '\\' && (b == ' ' || b == '=' || !safeSet[b]) {
				return true
			}
			i++
			continue
		}
		r, size := utf8.DecodeRuneInString(s[i:])
		if r == utf8.RuneError || unicode.IsSpace(r) || !unicode.IsPrint(r) {
			return true
		}
		i += size
	}
	return false
}
