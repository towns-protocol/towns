package locked

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// State and RO interface used across tests to demonstrate the recommended pattern
// where a parent struct owns a locked state field.
type state struct{ n int }

func (s *state) Inc()      { s.n++ }
func (s *state) Set(v int) { s.n = v }
func (s *state) Get() int  { return s.n }

type roState interface{ Get() int }

// Parent types demonstrating composition of locked state fields
type (
	parentLocked      struct{ st Locked[state] }
	parentLockedPtr   struct{ st LockedPtr[state] }
	parentRWLocked    struct{ st RWLocked[state, roState] }
	parentRWLockedPtr struct{ st RWLockedPtr[state, roState] }
)

func TestLocked_StatePattern(t *testing.T) {
	p := &parentLocked{}

	// write under lock
	s := p.st.Lock()
	s.Set(41)
	s.Inc()
	p.st.Unlock()

	// read under lock
	s = p.st.Lock()
	require.Equal(t, 42, s.Get())
	p.st.Unlock()
}

func TestLockedPtr_StatePattern(t *testing.T) {
	p := &parentLockedPtr{}

	p.st.Set(state{n: 10})

	s := p.st.Lock()
	s.Inc()
	p.st.Unlock()

	s = p.st.Lock()
	require.Equal(t, 11, s.Get())
	p.st.Unlock()

	// Swap underlying pointer
	p.st.Set(state{n: 5})
	s = p.st.Lock()
	require.Equal(t, 5, s.Get())
	p.st.Unlock()
}

func TestRWLocked_StatePattern(t *testing.T) {
	p := &parentRWLocked{}

	// writer path
	s := p.st.Lock()
	s.Set(1)
	s.Inc()
	p.st.Unlock()

	// reader path via RO interface
	ro := p.st.RLock()
	require.Equal(t, 2, ro.Get())
	p.st.RUnlock()
}

func TestRWLockedPtr_StatePattern(t *testing.T) {
	p := &parentRWLockedPtr{}
	p.st.Set(state{n: 0})

	ro := p.st.RLock()
	require.Equal(t, 0, ro.Get())
	p.st.RUnlock()

	s := p.st.Lock()
	s.Inc()
	p.st.Unlock()

	ro = p.st.RLock()
	require.Equal(t, 1, ro.Get())
	p.st.RUnlock()
}

func TestRWLocked_RLockPanicsWhenRONotImplemented(t *testing.T) {
	type badRO interface{ Get() int }
	var l RWLocked[int, badRO]

	require.Panics(t, func() {
		_ = l.RLock()
	})
}
