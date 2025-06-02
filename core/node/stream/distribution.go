package stream

import (
	"cmp"
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"maps"
	"math"
	"math/big"
	"slices"
	"sync/atomic"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/linkdata/deadlock"
)

const (
	// defaultVnodeCount is the number of virtual nodes per real node.
	// this is also an on-chain setting
	defaultVnodeCount = 150
	// defaultCandidateCount is the number of candidate nodes to pick the best nodes from,
	// this is also an on-chain setting
	defaultCandidateCount = 4
)

type (
	// Distributor provides methods to determine the set of nodes for a stream.
	Distributor interface {
		// ChooseStreamNodes returns a set of `count` nodes for the given streamID.
		ChooseStreamNodes(streamID StreamId, count int) ([]common.Address, error)

		// ChooseStreamNodesWithCriteria returns replFactor nodes that the given streamId can be assigned to.
		// For all returned nodes the given filter returned true for the node record.
		ChooseStreamNodesWithCriteria(
			streamID StreamId,
			count int,
			accept func(node common.Address, operator common.Address) bool,
		) ([]common.Address, error)

		// Reload the distributor state from the node registry.
		// It must be called when a node is added or removed from the system,
		// or its status changed from/to operational.
		Reload()
	}

	// DistributorSimulator is an interface that provides additional methods for
	// simulating the distributor. It should only be used in tests/simulations,
	// never in production code.
	DistributorSimulator interface {
		// NodeStreamLoad returns the number of streams assigned to the given node.
		NodeStreamLoad(node common.Address) uint64
		// SetNodeStreamLoad increases the node stream load
		SetNodeStreamLoad(load map[common.Address]uint64)
		// AssignStreamToNode assigns a stream to the given node.
		AssignStreamToNode(node common.Address)
		// NodeStreamCount returns the number of streams assigned to each node.
		NodeStreamCount() map[common.Address]int64
		// AddNewNode adds a new node to the distributor.
		AddNewNode(node common.Address, operator common.Address)
	}

	// streamNode represents a registered operation node in the system that is placed
	// on the consistent hashing ring. The node record and virtualNodes are immutable.
	// streamCount is updated through StreamUpdated events and an atomic that can be
	// read/written concurrently. Therefore is is safe to use a streamNode concurrently.
	streamNode struct {
		// NodeRecord holds the node's information as registered in the node registry.
		registries.NodeRecord
		// streamCount keeps track how many streams are assigned to this node.
		streamCount atomic.Int64
		// virtualNodes holds all positions on the ring this stream node is put.
		virtualNodes []uint64
	}

	// distributorImpl is designed to be immutable and thread-safe and contains the distributor state
	// and stream selection logic.
	//
	// It uses consistent hashing with a configurable amount of vnodes to ensure good distribution.
	// And pickes candidate count nodes from this ring as candidates. From these candidates it picks the
	// requested count nodes with the lowest streams assigned to them from different operators if possible.
	//
	// The number of virtual nodes is on-chain configurable and defaults to 150. The higher the better distribution
	// of nodes over the hash ring, the lower the faster the candidate selection is performed.
	// The number of candidate nodes is on-chain configurable and defaults to 5. The higher the number of
	// candidates to pick the best nodes from the faster the streams wil be balanced as the expense of extra
	// load for nodes that just joined (higher rate of streams assigened to them and fresh streams are more
	// active than older streams). So the number of candidates should be a trade-off between speed/load and fairness.
	distributorImpl struct {
		// totalStreams keeps track of the total number of streams in the system.
		totalStreams atomic.Uint64
		// nodes holds the mapping of a node's wallet address to its records as registered in the node registry.
		nodes map[common.Address]*streamNode
		// sortedKeys is the list of vnode keys sorted in ascending order.
		sortedKeys []uint64
		// ring maps virtual nodes to the real nodes.
		ring map[uint64]*streamNode
		// operators keeps track of unique operators that have at least 1 stream node operational.
		operators map[common.Address]struct{}
	}

	// streamsDistributor implements the Distributor interface and calculates a set of nodes to place a stream
	// on using consistent hashing with bounded load.
	streamsDistributor struct {
		// impl holds the distributor state and stream selection algorithm.
		// it is an atomic pointer to allow for lock free updates when nodes join/leave the network.
		impl atomic.Pointer[distributorImpl]
		// cfg provides on-chain config settings.
		cfg crypto.OnChainConfiguration
		// riverRegistry provides access to the River Registry contract for fetching node and stream information.
		riverRegistry *registries.RiverRegistryContract
		// nodeRegistryUpdated is set to true each time a node update is received.
		// when true the distributor state is reloaded from the node registry in the
		// onHeader callback.
		nodeRegistryUpdated atomic.Bool
		// onHeaderMu guards the onHeader callback to run in parallel
		onHeaderMu deadlock.Mutex
	}
)

var (
	// ErrInsufficientNodesAvailable is returned when the distributor is unable to
	// find enough nodes that the caller requested.
	ErrInsufficientNodesAvailable = AsRiverError(
		errors.New("insufficient nodes available to choose stream node"),
		Err_BAD_CONFIG,
	)

	_ Distributor          = (*streamsDistributor)(nil)
	_ DistributorSimulator = (*streamsDistributor)(nil)
)

// NewDistributor creates a new Distributor instance that calculates a set of nodes to place a stream on.
func NewDistributor(
	ctx context.Context,
	cfg crypto.OnChainConfiguration,
	blockNumber crypto.BlockNumber,
	chainMonitor crypto.ChainMonitor,
	riverRegistry *registries.RiverRegistryContract,
) (Distributor, error) {
	impl, err := newImpl(ctx, cfg, riverRegistry, blockNumber)
	if err != nil {
		return nil, err
	}

	d := &streamsDistributor{cfg: cfg, riverRegistry: riverRegistry}
	d.nodeRegistryUpdated.Store(false)
	d.impl.Store(impl)

	// onHeader is a ticker that reloads the distributor state when needed
	chainMonitor.OnHeader(func(ctx context.Context, header *types.Header) {
		// don't block the chain monitor nor run this callback in parallel
		if d.onHeaderMu.TryLock() {
			go func() {
				d.onHeader(ctx, header)
				d.onHeaderMu.Unlock()
			}()
		}
	})

	// update internal statistic for stream node calculation
	chainMonitor.OnContractWithTopicsEvent(blockNumber+1, riverRegistry.Address,
		[][]common.Hash{{riverRegistry.StreamRegistryAbi.Events["StreamUpdated"].ID}}, d.onStreamUpdate)

	return d, nil
}

func (d *streamsDistributor) ChooseStreamNodes(
	streamID StreamId,
	count int,
) ([]common.Address, error) {
	return d.ChooseStreamNodesWithCriteria(streamID, count, func(node common.Address, operator common.Address) bool {
		return true
	})
}

func (d *streamsDistributor) ChooseStreamNodesWithCriteria(
	streamID StreamId,
	count int,
	accept func(node common.Address, operator common.Address) bool,
) ([]common.Address, error) {
	impl := d.impl.Load()
	if len(impl.nodes) < count {
		return nil, ErrInsufficientNodesAvailable
	}

	cfg := d.cfg.Get()
	candidateCount := int(cfg.StreamDistribution.CandidatesCount)
	if candidateCount <= 0 {
		candidateCount = defaultCandidateCount
	}

	// ensure that the candidate count is at least the count requested
	candidateCount = max(candidateCount, count)

	wantedCandidates := min(candidateCount, len(impl.nodes))
	// if there are less operators than count drop the unique operator constraint
	wantedOperators := min(count, len(impl.operators))

	enough := func(candidates map[common.Address]*streamNode, operators map[common.Address]struct{}) bool {
		if len(candidates) < wantedCandidates {
			return false
		}
		if len(operators) < wantedOperators {
			return false
		}
		return true
	}

	// determine the location of stream on the hash ring and pick from there
	// the candidate nodes. Select the best `count` candidates as result.
	position := impl.position(streamID[:])
	i, _ := slices.BinarySearch(impl.sortedKeys, position)
	candidates := make(map[common.Address]*streamNode)
	candidateOperators := make(map[common.Address]struct{})

	for range 1000 { // put a hard coded upper bound on the loop to avoid infinite loops
		i = i % len(impl.sortedKeys)
		node := impl.ring[impl.sortedKeys[i]]
		i++

		if !accept(node.NodeAddress, node.Operator) {
			continue
		}

		candidates[node.NodeAddress] = node
		candidateOperators[node.Operator] = struct{}{}

		if enough(candidates, candidateOperators) {
			break
		}
	}

	if !enough(candidates, candidateOperators) {
		return nil, ErrInsufficientNodesAvailable
	}

	// sort candidates in ascending order based on the assigned streams
	sortedCandidates := slices.SortedFunc(maps.Values(candidates), func(a, b *streamNode) int {
		return cmp.Compare(a.streamCount.Load(), b.streamCount.Load())
	})

	// return the `count` candidates with the least amount of streams assigned to them
	// and if possible from unique operators.
	nodes := make([]common.Address, 0, count)
	nodeOperators := make(map[common.Address]struct{})
	i = 0
	for len(nodes) != count {
		if count <= len(impl.operators) { // guarantee unique operators
			if _, found := nodeOperators[sortedCandidates[i].Operator]; !found {
				nodes = append(nodes, sortedCandidates[i].NodeAddress)
				nodeOperators[sortedCandidates[i].Operator] = struct{}{}
			}
		} else {
			nodes = append(nodes, sortedCandidates[i].NodeAddress)
		}
		i++
	}

	return nodes, nil
}

func (d *streamsDistributor) onHeader(ctx context.Context, header *types.Header) {
	// when d.nodeRegistryUpdated is true reload the distributor state from the node registry.
	// set it to false so the next time this callback is called it returns immediatly unless
	// it was ordered to reload again.
	swapped := d.nodeRegistryUpdated.CompareAndSwap(true, false)
	if !swapped {
		return // distributor state is synced with node registry
	}

	// reload state from latest node registry state
	impl, err := newImpl(
		ctx,
		d.cfg,
		d.riverRegistry,
		crypto.BlockNumber(header.Number.Uint64()),
	)
	if err != nil {
		d.nodeRegistryUpdated.Store(true) // reload next time this callback is called
		logging.FromCtx(ctx).Error("Unable to refresh stream distributor state", "err", err)
		return
	}

	d.impl.Store(impl)
}

// onStreamUpdate updates the node load figures each time stream is allocated or created.
func (d *streamsDistributor) onStreamUpdate(ctx context.Context, log types.Log) {
	rr := d.riverRegistry
	parsed, err := rr.ParseEvent(ctx, rr.StreamRegistry.BoundContract(), rr.StreamEventInfo, &log)
	if err != nil {
		logging.FromCtx(ctx).Errorw("Failed to parse stream update event", "err", err, "log", log)
		return
	}

	event, ok := parsed.(*river.StreamUpdated)
	if !ok {
		return
	}

	events, err := river.ParseStreamUpdatedEvent(event)
	if err != nil {
		logging.FromCtx(ctx).Errorw("Failed to parse stream updated event",
			"err", err, "tx", log.TxHash, "index", log.Index)
		return
	}

	impl := d.impl.Load()

	for _, event := range events {
		reason := event.Reason()
		if reason == river.StreamUpdatedEventTypeAllocate || reason == river.StreamUpdatedEventTypeCreate {
			update := event.(*river.StreamState)
			for _, nodeAddr := range update.Stream.Nodes() {
				if node, found := impl.nodes[nodeAddr]; found {
					node.streamCount.Add(1)
				}
			}
		} else if reason == river.StreamUpdatedEventTypePlacementUpdated {
			newStream := event.(*river.StreamState)
			// load old stream record and decrease the node stream counters for all previous
			// nodes and increase the stream records counters for nodes in the new set.
			blockNumber := crypto.BlockNumber(log.BlockNumber - 1)
			if oldStream, err := rr.GetStream(ctx, newStream.GetStreamId(), blockNumber); err == nil {
				for _, nodeAddr := range oldStream.Nodes() {
					if node, found := impl.nodes[nodeAddr]; found {
						node.streamCount.Add(-1)
					}
				}
				for _, nodeAddr := range newStream.Stream.Nodes() {
					if node, found := impl.nodes[nodeAddr]; found {
						node.streamCount.Add(1)
					}
				}
			}
		}
	}
}

func (d *streamsDistributor) Reload() {
	d.nodeRegistryUpdated.Store(true)
}

// AssignStreamToNode is a debug endpoint for simulations/tests and must not be used in production code.
func (d *streamsDistributor) AssignStreamToNode(node common.Address) {
	if n, found := d.impl.Load().nodes[node]; found {
		n.streamCount.Add(1)
	} else {
		panic(fmt.Sprintf("node %s not found in distributor", node.Hex()))
	}
}

// NodeStreamCount is a debug endpoint for simulations/tests and must not be used in production code.
func (d *streamsDistributor) NodeStreamCount() map[common.Address]int64 {
	impl := d.impl.Load()
	counts := make(map[common.Address]int64)
	for _, n := range impl.nodes {
		counts[n.NodeAddress] = n.streamCount.Load()
	}
	return counts
}

func (d *streamsDistributor) AddNewNode(node common.Address, operator common.Address) {
	impl := d.impl.Load()

	record := registries.NodeRecord{
		NodeAddress: node,
		Operator:    operator,
		Status:      river.NodeStatus_Operational,
		Url:         fmt.Sprintf("https://%s.towns.com:443", node),
	}

	vnodeCount := int(d.cfg.Get().StreamDistribution.VnodeCount)
	if vnodeCount <= 0 {
		vnodeCount = defaultVnodeCount
	}

	d.impl.Store(impl.addStreamNode(record, 0, vnodeCount))
}

func (d *streamsDistributor) NodeStreamLoad(node common.Address) uint64 {
	impl := d.impl.Load()
	if streamNode, found := impl.nodes[node]; found {
		return uint64(streamNode.streamCount.Load())
	}
	return 0
}

func (d *streamsDistributor) SetNodeStreamLoad(load map[common.Address]uint64) {
	impl := d.impl.Load()
	for node, count := range load {
		if streamNode, found := impl.nodes[node]; found {
			streamNode.streamCount.Store(int64(count))
		}
	}
}

func newImpl(
	ctx context.Context,
	cfg crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	atBlockNumber crypto.BlockNumber,
) (*distributorImpl, error) {
	// add all operational nodes to the distributor and map to streamNode records
	nodes, err := riverRegistry.GetAllNodes(ctx, atBlockNumber)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Message("Failed to get all nodes")
	}

	// sort them by node address to ensure consistent ordering in case of virtual node position clashes
	slices.SortFunc(nodes, func(a, b registries.NodeRecord) int {
		return a.NodeAddress.Cmp(b.NodeAddress)
	})

	impl := &distributorImpl{
		nodes:      make(map[common.Address]*streamNode),
		ring:       make(map[uint64]*streamNode),
		operators:  make(map[common.Address]struct{}),
		sortedKeys: make([]uint64, 0, defaultVnodeCount*len(nodes)),
	}

	vnodeCount := cfg.Get().StreamDistribution.VnodeCount
	if vnodeCount <= 0 {
		vnodeCount = defaultVnodeCount
	}

	totalStreamCount, err := riverRegistry.GetStreamCount(ctx, atBlockNumber)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Message("Failed to get stream count")
	}
	impl.totalStreams.Store(uint64(totalStreamCount))

	for _, node := range nodes {
		if node.Status == river.NodeStatus_Operational {
			streamCount, err := riverRegistry.GetStreamCountOnNode(ctx, atBlockNumber, node.NodeAddress)
			if err != nil {
				return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Message("Failed to get node stream count")
			}
			impl = impl.addStreamNode(node, streamCount, int(vnodeCount))
		}
	}

	slices.Sort(impl.sortedKeys)

	return impl, nil
}

func (d *distributorImpl) addStreamNode(
	node registries.NodeRecord,
	streamCount int64,
	vnodeCount int,
) *distributorImpl {
	if _, found := d.nodes[node.NodeAddress]; found {
		return d
	}

	var (
		newImpl    = d.clone()
		input      [32]byte
		i          = 0
		streamNode = &streamNode{NodeRecord: node, virtualNodes: make([]uint64, 0, vnodeCount)}
	)

	streamNode.streamCount.Store(streamCount)

	// generate the virtual nodes positions for the stream node from its wallet address and a sequence number
	// and place the stream node on the ring for every unique virtual node position.
	copy(input[:], node.NodeAddress[:])
	for len(streamNode.virtualNodes) != vnodeCount {
		i++
		input[24], input[25], input[26], input[27] = byte(i>>56), byte(i>>48), byte(i>>40), byte(i>>32)
		input[28], input[29], input[30], input[31] = byte(i>>24), byte(i>>16), byte(i>>8), byte(i&0xFF)
		position := newImpl.position(input[:])
		if _, found := newImpl.ring[position]; !found {
			streamNode.virtualNodes = append(streamNode.virtualNodes, position)
			newImpl.ring[position] = streamNode
			newImpl.sortedKeys = append(newImpl.sortedKeys, position)
		}
	}

	newImpl.nodes[node.NodeAddress] = streamNode
	newImpl.operators[node.Operator] = struct{}{}

	slices.Sort(newImpl.sortedKeys)

	return newImpl
}

var mod = new(big.Int).SetUint64(math.MaxUint64)

// position returns the position on the ring for the given input.
func (d *distributorImpl) position(input []byte) uint64 {
	h := sha256.Sum256(input)
	return new(big.Int).Mod(new(big.Int).SetBytes(h[:]), mod).Uint64()
}

func (d *distributorImpl) clone() *distributorImpl {
	cpy := &distributorImpl{
		nodes:      maps.Clone(d.nodes),
		sortedKeys: slices.Clone(d.sortedKeys),
		ring:       maps.Clone(d.ring),
		operators:  maps.Clone(d.operators),
	}
	cpy.totalStreams.Store(d.totalStreams.Load())

	return cpy
}
