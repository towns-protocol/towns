package testrpcstream

import (
	"errors"
	"io"
)

type testRpcStream[T any] struct {
	data   []*T
	cursor int
	closed bool
}

func NewTestRpcStream[T any](data []*T) *testRpcStream[T] {
	return &testRpcStream[T]{data: data, cursor: -1}
}

func (s *testRpcStream[T]) Close() error {
	s.closed = true
	return nil
}

func (s *testRpcStream[T]) Err() error {
	if s.closed {
		return errors.New("stream closed")
	}
	if s.cursor >= len(s.data) {
		return io.EOF
	}
	if s.cursor < 0 {
		return errors.New("stream not initialized")
	}
	return nil
}

func (s *testRpcStream[T]) Msg() *T {
	if s.cursor >= 0 && s.cursor < len(s.data) {
		return s.data[s.cursor]
	}
	return nil
}

func (s *testRpcStream[T]) Receive() bool {
	s.cursor++
	return s.cursor < len(s.data)
}
