package syncv3

import (
	"slices"

	"github.com/puzpuzpuz/xsync/v4"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// Registry is an interface that defines the behavior of the sync operation registry.
// Keep track on all sync operations and their state.
type Registry interface {
	// AddOp adds an operation to the registry.
	AddOp(op Operation) (func(), error)
	// GetOp retrieves an operation by its ID.
	GetOp(id string) (Operation, bool)

	// AddOpToExistingStream adds an operation to an existing stream.
	// It returns true if the operation was added, false if the given stream does not exist.
	// Returns two booleans:
	//  - false if the stream does not exist
	//  - false if the operation already exists in the stream
	AddOpToExistingStream(streamId StreamId, op Operation) (bool, bool)
	// AddOpToStream adds an operation to a stream.
	// Creates a new record in the map if the stream does not exist.
	AddOpToStream(streamID StreamId, op Operation)
	// RemoveOpFromStream removes an operation from a stream.
	RemoveOpFromStream(streamId StreamId, id string)
	// GetStreamOps retrieves all operations associated with a specific stream ID.
	GetStreamOps(streamId StreamId) []Operation
	// RemoveStream removes a stream from the registry.
	RemoveStream(streamId StreamId)
}

// registry implements the Registry interface using xsync.Map for thread-safe operations.
type registry struct {
	ops *xsync.Map[string, Operation]
	// TODO: The given slice if always changing, use another structure with a lock or something
	streams *xsync.Map[StreamId, []Operation]
}

// NewRegistry creates a new instance of the Registry.
func NewRegistry() Registry {
	return &registry{
		ops:     xsync.NewMap[string, Operation](),
		streams: xsync.NewMap[StreamId, []Operation](),
	}
}

func (r *registry) AddOp(op Operation) (func(), error) {
	if _, loaded := r.ops.Load(op.ID()); loaded {
		return nil, RiverError(Err_ALREADY_EXISTS, "operation with ID %s already exists", op.ID())
	}

	r.ops.Store(op.ID(), op)

	return func() { r.ops.Delete(op.ID()) }, nil
}

func (r *registry) GetOp(id string) (Operation, bool) {
	return r.ops.Load(id)
}

func (r *registry) AddOpToExistingStream(streamID StreamId, op Operation) (streamExists bool, added bool) {
	r.streams.Compute(
		streamID,
		func(ops []Operation, loaded bool) ([]Operation, xsync.ComputeOp) {
			if !loaded {
				return nil, xsync.CancelOp
			}
			streamExists = true
			if slices.ContainsFunc(ops, func(o Operation) bool {
				return o.ID() == op.ID()
			}) {
				return ops, xsync.CancelOp
			}
			added = true
			return append(slices.Clone(ops), op), xsync.UpdateOp
		},
	)
	return
}

func (r *registry) AddOpToStream(streamID StreamId, op Operation) {
	r.streams.Compute(
		streamID,
		func(ops []Operation, _ bool) ([]Operation, xsync.ComputeOp) {
			if slices.ContainsFunc(ops, func(o Operation) bool {
				return o.ID() == op.ID()
			}) {
				// Operation already exists in the stream
				return ops, xsync.CancelOp
			}

			return append(slices.Clone(ops), op), xsync.UpdateOp
		},
	)
}

func (r *registry) RemoveOpFromStream(streamID StreamId, id string) {
	r.streams.Compute(
		streamID,
		func(ops []Operation, loaded bool) ([]Operation, xsync.ComputeOp) {
			// Create a copy of the slice before modifying to prevent race conditions
			copied := slices.DeleteFunc(slices.Clone(ops), func(op Operation) bool {
				return op.ID() == id
			})
			if len(copied) == len(ops) {
				return ops, xsync.CancelOp
			}
			return copied, xsync.UpdateOp
		},
	)
}

func (r *registry) GetStreamOps(streamID StreamId) []Operation {
	ops, ok := r.streams.Load(streamID)
	if !ok {
		return nil
	}
	return slices.Clone(ops)
}

func (r *registry) RemoveStream(streamID StreamId) {
	r.streams.Delete(streamID)
}
