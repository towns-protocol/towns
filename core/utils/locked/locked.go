package locked

import "sync"

// Locked guards a value of type T with a sync.Mutex.
// It is mainly intended to be used as a field of a struct
// to make it hard to access mutex-protected fields without
// acquiring the lock first.
//
// When Locked is used as a field of a struct, memory layout of the parent struct
// is equivalent to declaring mutex and fields directly in the parent struct.
// So there is no allocation or performance overhead compared to declaring
// mutex and fields directly in the parent struct.
//
// Lock returns the pointer to the guarded value while holding the lock. Unlock must be
// called to release the lock.
//
// Usage:
//
//	type myStructState struct {
//		a int
//	    b string
//	}
//
//	 type MyStruct strunct {
//	    immutableField string
//	    state myStructState
//	 }
//
//	 func (ms *MyStruct) Update(a int, b string) {
//		state := ms.state.Lock()
//		defer ms.state.Unlock()
//		state.a = a
//		state.b = b
//	}
type Locked[T any] struct {
	value T
	mu    sync.Mutex
}

func (l *Locked[T]) Lock() *T {
	l.mu.Lock()
	return &l.value
}

func (l *Locked[T]) Unlock() {
	l.mu.Unlock()
}

// LockedPtr guards a pointer to T with a sync.Mutex and allows swapping
// the underlying pointer via Set.
//
// Lock returns the guarded pointer while holding the lock. Unlock must be
// called to release the lock. Set atomically replaces the guarded pointer.
type LockedPtr[T any] struct {
	value *T
	mu    sync.Mutex
}

func (l *LockedPtr[T]) Lock() *T {
	l.mu.Lock()
	return l.value
}

func (l *LockedPtr[T]) Unlock() {
	l.mu.Unlock()
}

func (l *LockedPtr[T]) Set(value T) {
	l.mu.Lock()
	l.value = &value
	l.mu.Unlock()
}

// RWLocked guards a value of type T with a sync.RWMutex and exposes a read-only
// view through the RO type parameter, which must be an interface implemented by *T.
//
//   - Lock/Unlock: acquire/release exclusive access and return *T for mutation.
//   - RLock/RUnlock: acquire/release shared access and return RO, a read-only
//     interface implemented by *T. If *T does not implement RO, RLock will panic
//     at the type assertion.
//
// Usage:
//
//	type state struct{ n int }
//	func (s *state) Inc()    { s.n++ }
//	func (s *state) Get() int { return s.n } // read-only method
//
//	// RO interface implemented by *state
//	type roState interface{ Get() int }
//
//	// Parent owns the locked state field
//	type Service struct {
//	    st locked.RWLocked[state, roState]
//	}
//
//	func (svc *Service) Write() {
//	    s := svc.st.Lock()
//	    s.Inc()
//	    svc.st.Unlock()
//	}
//
//	func (svc *Service) Read() int {
//	    ro := svc.st.RLock()
//	    defer svc.st.RUnlock()
//	    return ro.Get()
//	}
//
// See Locked for more details and suggested usage.
type RWLocked[T any, RO any] struct {
	value T
	mu    sync.RWMutex
}

func (l *RWLocked[T, RO]) Lock() *T {
	l.mu.Lock()
	return &l.value
}

func (l *RWLocked[T, RO]) Unlock() {
	l.mu.Unlock()
}

func (l *RWLocked[T, RO]) RLock() RO {
	l.mu.RLock()
	return any(&l.value).(RO)
}

func (l *RWLocked[T, RO]) RUnlock() {
	l.mu.RUnlock()
}

// RWLockedPtr guards a pointer to T with a sync.RWMutex and exposes a read-only
// view through the RO type parameter, which must be an interface implemented by *T.
//
//   - Lock/Unlock: acquire/release exclusive access and return *T for mutation.
//   - RLock/RUnlock: acquire/release shared access and return RO from the stored
//     *T pointer. If *T does not implement RO, RLock will panic at the assertion.
type RWLockedPtr[T any, RO any] struct {
	value *T
	mu    sync.RWMutex
}

func (l *RWLockedPtr[T, RO]) Lock() *T {
	l.mu.Lock()
	return l.value
}

func (l *RWLockedPtr[T, RO]) Unlock() {
	l.mu.Unlock()
}

func (l *RWLockedPtr[T, RO]) RLock() RO {
	l.mu.RLock()
	return any(l.value).(RO)
}

func (l *RWLockedPtr[T, RO]) RUnlock() {
	l.mu.RUnlock()
}

func (l *RWLockedPtr[T, RO]) Set(value T) {
	l.mu.Lock()
	l.value = &value
	l.mu.Unlock()
}
