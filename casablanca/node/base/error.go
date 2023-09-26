package base

import (
	"casablanca/node/protocol"
	"context"
	"fmt"
	"strconv"
	"strings"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"
)

func RiverError(code protocol.Err, msg string, tags ...any) *RiverErrorImpl {
	e := &RiverErrorImpl{
		Code: code,
		Msg:  msg,
	}
	if len(tags) > 0 {
		_ = e.Tags(tags...)
	}
	return e
}

func RiverErrorf(code protocol.Err, format string, a ...any) *RiverErrorImpl {
	return &RiverErrorImpl{
		Code: code,
		Msg:  fmt.Sprintf(format, a...),
	}
}

type RiverErrorImpl struct {
	Code      protocol.Err
	Msg       string
	NamedTags []RiverErrorTag
	Base      error
	Funcs     []string
}

type RiverErrorTag struct {
	Name  string
	Value any
}

func (e *RiverErrorImpl) Error() string {
	var sb strings.Builder
	e.WriteMessage(&sb)
	for _, tag := range e.NamedTags {
		WriteTag(&sb, tag)
	}
	return sb.String()
}

func (e *RiverErrorImpl) WriteMessage(sb *strings.Builder) {
	for i := len(e.Funcs) - 1; i >= 0; i-- {
		sb.WriteString(e.Funcs[i])
		sb.WriteString(": ")
	}

	sb.WriteByte('(')
	sb.WriteString(strconv.Itoa(int(e.Code)))
	sb.WriteByte(':')
	sb.WriteString(e.Code.String())
	sb.WriteByte(')')
	sb.WriteByte(' ')

	if e.Msg != "" {
		sb.WriteString(e.Msg)
	}

	if e.Base != nil {
		if e.Msg != "" {
			sb.WriteString(" base_error: ")
		}
		sb.WriteString(e.Base.Error())
	}
}

func (e *RiverErrorImpl) GetMessage() string {
	var sb strings.Builder
	e.WriteMessage(&sb)
	return sb.String()
}

func WriteTag(sb *strings.Builder, tag RiverErrorTag) {
	sb.WriteString("\n    ")
	sb.WriteString(tag.Name)
	sb.WriteString(" = ")
	sb.WriteString(fmt.Sprint(tag.Value))
}

func (e *RiverErrorImpl) Tag(name string, value any) *RiverErrorImpl {
	e.NamedTags = append(e.NamedTags, RiverErrorTag{
		Name:  name,
		Value: value,
	})
	return e
}

func (e *RiverErrorImpl) Tags(v ...any) *RiverErrorImpl {
	i := 0
	for i+1 < len(v) {
		if str, ok := v[i].(string); ok {
			_ = e.Tag(str, v[i+1])
			i += 2
		} else {
			_ = e.Tag("!BAD_TAG_NAME", v[i])
			i++
		}
	}
	if i < len(v) {
		_ = e.Tag("!LAST_TAG_NO_NAME", v[i])
	}
	return e
}

func (e *RiverErrorImpl) Func(method string) *RiverErrorImpl {
	e.Funcs = append(e.Funcs, method)
	return e
}

func (e *RiverErrorImpl) Message(msg string) *RiverErrorImpl {
	if e.Msg == "" {
		e.Msg = msg
	} else {
		e.Msg += " | " + msg
	}

	return e
}

func IsRiverError(err error) bool {
	_, ok := err.(*RiverErrorImpl)
	return ok
}

func AsRiverError(err error) *RiverErrorImpl {
	e, ok := err.(*RiverErrorImpl)
	if ok {
		return e
	}
	if err != nil {
		return &RiverErrorImpl{
			Code: protocol.Err_UNKNOWN,
			Base: err,
		}
	} else {
		return &RiverErrorImpl{
			Code: protocol.Err_UNKNOWN,
			Msg:  "nil error",
		}
	}
}

func WrapRiverError(code protocol.Err, err error) *RiverErrorImpl {
	e := AsRiverError(err)
	e.Code = code
	return e
}

func ErrToConnectCode(err protocol.Err) connect_go.Code {
	if err < protocol.Err_CANCELED || err > protocol.Err_UNAUTHENTICATED {
		return connect_go.CodeFailedPrecondition
	}
	return connect_go.Code(err)
}

func (e *RiverErrorImpl) AsConnectError() *connect_go.Error {
	return connect_go.NewError(ErrToConnectCode(e.Code), e)
}

func (e *RiverErrorImpl) ForEachTag(f func(name string, value any) bool) {
	for _, tag := range e.NamedTags {
		if !f(tag.Name, tag.Value) {
			break
		}
	}
}

func (e *RiverErrorImpl) FlattenTags() []any {
	var tags []any
	for _, tag := range e.NamedTags {
		tags = append(tags, tag.Name, tag.Value)
	}
	return tags
}

func (e *RiverErrorImpl) LogWithLevel(l *slog.Logger, level slog.Level) *RiverErrorImpl {
	// Context for slog is optional, generally in this codebase context is not passed to slog.
	var nilContext context.Context
	l.Log(nilContext, level, e.GetMessage(), e.FlattenTags()...)
	return e
}

func (e *RiverErrorImpl) Log(l *slog.Logger) *RiverErrorImpl {
	return e.LogWithLevel(l, slog.LevelError)
}

func (e *RiverErrorImpl) LogError(l *slog.Logger) *RiverErrorImpl {
	return e.LogWithLevel(l, slog.LevelError)
}

func (e *RiverErrorImpl) LogWarn(l *slog.Logger) *RiverErrorImpl {
	return e.LogWithLevel(l, slog.LevelWarn)
}

func (e *RiverErrorImpl) LogInfo(l *slog.Logger) *RiverErrorImpl {
	return e.LogWithLevel(l, slog.LevelInfo)
}

func (e *RiverErrorImpl) LogDebug(l *slog.Logger) *RiverErrorImpl {
	return e.LogWithLevel(l, slog.LevelDebug)
}

func ToConnectError(err error) *connect_go.Error {
	if err == nil {
		return nil
	}
	if e, ok := err.(*connect_go.Error); ok {
		return e
	}
	if e, ok := err.(*RiverErrorImpl); ok {
		return e.AsConnectError()
	}
	return connect_go.NewError(connect_go.CodeUnknown, err)
}
