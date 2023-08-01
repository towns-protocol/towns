package events

type OrderedMap[K comparable, V any] struct {
	M map[K]V
	A []V
}

func NewOrderedMap[K comparable, V any](reserve int) *OrderedMap[K, V] {
	return &OrderedMap[K, V]{
		M: make(map[K]V, reserve),
		A: make([]V, 0, reserve),
	}
}

func OrderedMapFromMap[K comparable, V any](m map[K]V) *OrderedMap[K, V] {
	a := make([]V, 0, len(m))
	for _, v := range m {
		a = append(a, v)
	}
	return &OrderedMap[K, V]{
		M: m,
		A: a,
	}
}

func OrderMapFromArray[K comparable, V any](a []V, key func(V) K) *OrderedMap[K, V] {
	m := make(map[K]V, len(a))
	for _, v := range a {
		m[key(v)] = v
	}
	return &OrderedMap[K, V]{
		M: m,
		A: a,
	}
}

func (m *OrderedMap[K, V]) Get(key K) (V, bool) {
	v, ok := m.M[key]
	return v, ok
}

func (m *OrderedMap[K, V]) Has(key K) bool {
	_, ok := m.M[key]
	return ok
}

func (m *OrderedMap[K, V]) Len() int {
	return len(m.A)
}

func (m *OrderedMap[K, V]) Set(key K, value V) {
	_, ok := m.M[key]
	if ok {
		panic("key already exists")
	}
	m.M[key] = value
	m.A = append(m.A, value)
}

// Copy returns a deep copy of the map.
func (m *OrderedMap[K, V]) Copy(extraCapacity int) *OrderedMap[K, V] {
	newMap := make(map[K]V, len(m.M)+extraCapacity)
	for k, v := range m.M {
		newMap[k] = v
	}
	return &OrderedMap[K, V]{
		M: newMap,
		A: append(make([]V, 0, len(m.A)+extraCapacity), m.A...),
	}
}
