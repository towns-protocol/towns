// See [conventions.md](../conventions.md) for usage examples.
// TODO: use formatter for dlog for value formatting instead of fmt.

package base

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"runtime"
	"strconv"
	"strings"

	"connectrpc.com/connect"
	"github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/rpc"
)

// Constants are not exported when go bindings are generated from solidity, so there is duplication here.
const (
	ContractErrorStreamNotFound = "NOT_FOUND"
	ContractErrorNodeNotFound   = "NODE_NOT_FOUND"
	ContractErrorAlreadyExists  = "ALREADY_EXISTS"
	ContractErrorOutOfBounds    = "OUT_OF_BOUNDS"
)

// Without this limit, go's http reader fails and replaces actual
// error with "http: suspiciously long trailer after chunked body".
const CONNECT_ERROR_MESSAGE_LIMIT = 1500

const RIVER_ERROR_HEADER = "X-River-Error"

var isDebugCallStack bool

func init() {
	_, isDebugCallStack = os.LookupEnv("RIVER_DEBUG_CALLSTACK")
}

func FormatCallstack(skip int) string {
	pc := make([]uintptr, 32)
	n := runtime.Callers(skip, pc)
	if n == 0 {
		return ""
	}

	pc = pc[:n]
	frames := runtime.CallersFrames(pc)

	var frame runtime.Frame
	more := true
	var sb strings.Builder
	sb.WriteString("Callstack:\n")
	for more {
		frame, more = frames.Next()

		sb.WriteString("        ")
		sb.WriteString(frame.Function)
		sb.WriteString(" ")
		sb.WriteString(frame.File)
		sb.WriteString(":")
		sb.WriteString(strconv.Itoa(frame.Line))
		sb.WriteString("\n")
	}
	return sb.String()
}

func RiverError(code protocol.Err, msg string, tags ...any) *RiverErrorImpl {
	e := &RiverErrorImpl{
		Code: code,
		Msg:  msg,
	}
	if len(tags) > 0 {
		_ = e.Tags(tags...)
	}
	if isDebugCallStack {
		_ = e.Tag("callstack", FormatCallstack(3))
	}
	return e
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
	if goStringer, ok := tag.Value.(fmt.GoStringer); ok {
		sb.WriteString(goStringer.GoString())
	} else if byteSlice, ok := tag.Value.([]byte); ok {
		sb.WriteString(hex.EncodeToString(byteSlice))
	} else if byteSlicePtr, ok := tag.Value.(*[]byte); ok {
		sb.WriteString(hex.EncodeToString(*byteSlicePtr))
	} else {
		sb.WriteString(fmt.Sprint(tag.Value))
	}
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

func IsConnectNetworkError(err error) bool {
	if ce, ok := err.(*connect.Error); ok {
		return IsConnectNetworkErrorCode(ce.Code())
	}
	return false
}

// IsConnectNetworkError identifies connect codes that indicate a network error occurred during
// a connect call to a downstream client.
func IsConnectNetworkErrorCode(code connect.Code) bool {
	return code == connect.CodeUnavailable
}

// If there is information to be extracted from the error, then code is set accordingly.
// If not, then provided defaultCode is used.
func AsRiverError(err error, defaultCode ...protocol.Err) *RiverErrorImpl {
	e, ok := err.(*RiverErrorImpl)
	if ok {
		return e
	}

	code := protocol.Err_UNKNOWN
	if len(defaultCode) > 0 {
		code = defaultCode[0]
	}

	// Map connect errors to river errors
	if ce, ok := err.(*connect.Error); ok {
		if value, ok := ce.Meta()[RIVER_ERROR_HEADER]; ok && len(value) > 0 {
			v, ok := protocol.Err_value[value[0]]
			if ok {
				code = protocol.Err(v)
			}
		}
		if code == protocol.Err_UNKNOWN {
			code = protocol.Err(ce.Code())
		}
		// Wrap connect network errors from fanout nodes so they are not propogated back to the
		// original caller as is, otherwise this node may seem unavailable.
		if IsConnectNetworkErrorCode(ce.Code()) {
			code = protocol.Err_DOWNSTREAM_NETWORK_ERROR
		}
		return &RiverErrorImpl{
			Code: code,
			Base: err,
		}
	}

	// Map contract errors to river errors
	if de, ok := err.(rpc.DataError); ok {
		var tags []RiverErrorTag
		if de.ErrorData() != nil {
			hexStr := de.ErrorData().(string)
			hexStr = strings.TrimPrefix(hexStr, "0x")
			revert, e := hex.DecodeString(hexStr)
			if e == nil {
				reason, e := abi.UnpackRevert(revert)
				if e == nil {
					tags = []RiverErrorTag{{"revert_reason", reason}}
					if reason == ContractErrorStreamNotFound {
						code = protocol.Err_NOT_FOUND
					} else if reason == ContractErrorNodeNotFound {
						code = protocol.Err_UNKNOWN_NODE
					} else if reason == ContractErrorAlreadyExists {
						code = protocol.Err_ALREADY_EXISTS
					} else if reason == ContractErrorOutOfBounds {
						code = protocol.Err_INVALID_ARGUMENT
					}
				}
			}
		}
		return &RiverErrorImpl{
			Code:      code,
			Base:      err,
			Msg:       "Contract Returned Error",
			NamedTags: tags,
		}
	}

	if err != nil {
		if err == context.Canceled {
			code = protocol.Err_CANCELED
		} else if err == context.DeadlineExceeded {
			code = protocol.Err_DEADLINE_EXCEEDED
		}
		return &RiverErrorImpl{
			Code: code,
			Base: err,
		}
	} else {
		return &RiverErrorImpl{
			Code: protocol.Err_UNKNOWN,
			Msg:  "nil error",
		}
	}
}

// WrapRiverError and AsRiverError became the same:
// If there is information to be extracted from the error, then code is set accordingly.
// If not, then provided code is used.
func WrapRiverError(code protocol.Err, err error) *RiverErrorImpl {
	e := AsRiverError(err, code)
	return e
}

func ErrToConnectCode(err protocol.Err) connect.Code {
	if err < protocol.Err_CANCELED || err > protocol.Err_UNAUTHENTICATED {
		return connect.CodeFailedPrecondition
	}
	return connect.Code(err)
}

func (e *RiverErrorImpl) AsConnectError() *connect.Error {
	err := connect.NewError(ErrToConnectCode(e.Code), TruncateErrorToConnectLimit(e))
	if str, ok := protocol.Err_name[int32(e.Code)]; ok {
		err.Meta()[RIVER_ERROR_HEADER] = []string{str}
	}
	return err
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

func (e *RiverErrorImpl) GetTag(name string) any {
	for _, tag := range e.NamedTags {
		if tag.Name == name {
			return tag.Value
		}
	}
	return nil
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

func ToConnectError(err error) *connect.Error {
	if err == nil {
		return nil
	}
	if e, ok := err.(*connect.Error); ok {
		return e
	}
	if e, ok := err.(*RiverErrorImpl); ok {
		return e.AsConnectError()
	}
	return connect.NewError(connect.CodeUnknown, TruncateErrorToConnectLimit(err))
}

func TruncateErrorToConnectLimit(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	if len(msg) > CONNECT_ERROR_MESSAGE_LIMIT {
		return errors.New(msg[:CONNECT_ERROR_MESSAGE_LIMIT])
	}
	return err
}
