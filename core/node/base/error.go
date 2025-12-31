// See [conventions.md](../conventions.md) for usage examples.

package base

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/rpc"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"golang.org/x/exp/slices"

	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
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
		_ = e.tag("callstack", FormatCallstack(3), 0)
	}
	return e
}

func RiverErrorWithBase(code protocol.Err, msg string, base error, tags ...any) *RiverErrorImpl {
	var bases []error
	if base != nil {
		bases = []error{base}
	}
	return RiverErrorWithBases(code, msg, bases, tags...)
}

func RiverErrorWithBases(code protocol.Err, msg string, bases []error, tags ...any) *RiverErrorImpl {
	e := RiverError(code, msg, tags...)
	e.Bases = bases
	return e
}

type RiverErrorImpl struct {
	Code      protocol.Err
	Msg       string
	NamedTags []RiverErrorTag
	Bases     []error
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

func (e *RiverErrorImpl) Unwrap() []error {
	return e.Bases
}

func (e *RiverErrorImpl) Is(target error) bool {
	if riverErr, ok := target.(*RiverErrorImpl); ok && riverErr.Code == e.Code {
		return true
	}
	return false
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

	for i, base := range e.Bases {
		sb.WriteString("\n<<base ")
		num := strconv.Itoa(i)
		sb.WriteString(num)
		sb.WriteString(": ")
		sb.WriteString(base.Error())
		sb.WriteString("\n>>base ")
		sb.WriteString(num)
		sb.WriteString(" end")
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

func (e *RiverErrorImpl) tag(name string, value any, duplicateCheck int) *RiverErrorImpl {
	for i := 0; i < duplicateCheck; i++ {
		if e.NamedTags[i].Name == name {
			e.NamedTags[i].Value = value
			return e
		}
	}
	e.NamedTags = append(e.NamedTags, RiverErrorTag{
		Name:  name,
		Value: value,
	})
	return e
}

func (e *RiverErrorImpl) Tag(name string, value any) *RiverErrorImpl {
	return e.tag(name, value, len(e.NamedTags))
}

func (e *RiverErrorImpl) Tags(v ...any) *RiverErrorImpl {
	duplicateCheck := len(e.NamedTags)
	i := 0
	for i+1 < len(v) {
		if str, ok := v[i].(string); ok {
			_ = e.tag(str, v[i+1], duplicateCheck)
			i += 2
		} else {
			_ = e.tag("!BAD_TAG_NAME", v[i], 0)
			i++
		}
	}
	if i < len(v) {
		_ = e.tag("!LAST_TAG_NO_NAME", v[i], 0)
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

func IsRiverErrorCode(err error, code protocol.Err) bool {
	return err != nil && AsRiverError(err).Code == code
}

// IsCodeWithBases checks if the error or any of base errors match the given code.
func (e *RiverErrorImpl) IsCodeWithBases(code protocol.Err) bool {
	if e == nil {
		return false
	}
	if e.Code == code {
		return true
	}
	for _, base := range e.Bases {
		if AsRiverError(base).Code == code {
			return true
		}
	}
	return false
}

func IsConnectNetworkError(err error) bool {
	if ce, ok := err.(*connect.Error); ok && ce != nil {
		return IsConnectNetworkErrorCode(ce.Code())
	}
	return false
}

// IsConnectNetworkErrorCode identifies connect codes that indicate a network error occurred during
// a connect call to a downstream client.
func IsConnectNetworkErrorCode(code connect.Code) bool {
	return code == connect.CodeUnavailable
}

// If there is information to be extracted from the error, then code is set accordingly.
// If not, then provided defaultCode is used.
func AsRiverError(err error, defaultCode ...protocol.Err) *RiverErrorImpl {
	if err == nil {
		return nil
	}

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
			Code:  code,
			Bases: []error{err},
		}
	}

	// Map contract errors to river errors
	if de, ok := err.(rpc.DataError); ok {
		var tags []RiverErrorTag
		if de.ErrorData() != nil {
			hexStr, ok := de.ErrorData().(string)
			if ok {
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
		}
		return &RiverErrorImpl{
			Code:      code,
			Bases:     []error{err},
			Msg:       "Contract Returned Error",
			NamedTags: tags,
		}
	}

	if err == context.Canceled {
		code = protocol.Err_CANCELED
	} else if err == context.DeadlineExceeded {
		code = protocol.Err_DEADLINE_EXCEEDED
	}

	return &RiverErrorImpl{
		Code:  code,
		Bases: []error{err},
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

func (e *RiverErrorImpl) LogWithLevel(l *logging.Log, level zapcore.Level) *RiverErrorImpl {
	// Context for zap is optional, generally in this codebase context is not passed to zap.
	l.Logw(level, e.GetMessage(), e.FlattenTags()...)
	return e
}

func (e *RiverErrorImpl) Log(l *logging.Log) *RiverErrorImpl {
	return e.LogWithLevel(l, zapcore.ErrorLevel)
}

func (e *RiverErrorImpl) LogError(l *logging.Log) *RiverErrorImpl {
	return e.LogWithLevel(l, zapcore.ErrorLevel)
}

func (e *RiverErrorImpl) LogWarn(l *logging.Log) *RiverErrorImpl {
	return e.LogWithLevel(l, zapcore.WarnLevel)
}

func (e *RiverErrorImpl) LogInfo(l *logging.Log) *RiverErrorImpl {
	return e.LogWithLevel(l, zapcore.InfoLevel)
}

func (e *RiverErrorImpl) LogDebug(l *logging.Log) *RiverErrorImpl {
	return e.LogWithLevel(l, zapcore.DebugLevel)
}

func (e *RiverErrorImpl) LogLevel(l *logging.Log, level zapcore.Level) *RiverErrorImpl {
	return e.LogWithLevel(l, level)
}

func (e *RiverErrorImpl) MarshalLogObject(enc zapcore.ObjectEncoder) error {
	enc.AddString("message", e.GetMessage())

	enc.AddString("kind", e.Code.String())

	e.ForEachTag(func(name string, value any) bool {
		zap.Any(name, value).AddTo(enc)
		return true
	})

	return nil
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

// IsOperationRetriableOnRemotes returns true if the given error is the river error and its code is in the list
// of codes allowed to be retried on remotes.
func IsOperationRetriableOnRemotes(err error) bool {
	// If the error is not a river error, then it is not retriable.
	var riverErrorImpl *RiverErrorImpl
	if !errors.As(err, &riverErrorImpl) {
		return false
	}

	return slices.Contains([]protocol.Err{
		protocol.Err_UNKNOWN,
		protocol.Err_DEADLINE_EXCEEDED,
		protocol.Err_NOT_FOUND,
		protocol.Err_RESOURCE_EXHAUSTED,
		protocol.Err_ABORTED,
		protocol.Err_UNIMPLEMENTED,
		protocol.Err_INTERNAL,
		protocol.Err_UNAVAILABLE,
		protocol.Err_DATA_LOSS,
		protocol.Err_BUFFER_FULL,
		protocol.Err_STREAM_RECONCILIATION_REQUIRED,
		protocol.Err_MINIBLOCK_TOO_NEW,
		protocol.Err_MINIBLOCKS_STORAGE_FAILURE,
		protocol.Err_MINIBLOCKS_NOT_FOUND,
	}, AsRiverError(err).Code)
}
