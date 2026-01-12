package streamplacement

import (
	"cmp"
	"context"
	"fmt"
	"maps"
	"math"
	"slices"
	"sync/atomic"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"

	"github.com/cespare/xxhash/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/linkdata/deadlock"
)

const (
	// defaultExtraCandidatesCount is the number of extra candidate nodes to pick the best nodes from.
	// That means that when ChooseStreamNodes selects nodes to place a stream it selects replication
	// factor + extra candidates count nodes and then picks the best replication factor nodes from them.
	// This is the default value for the on-chain setting `stream.distribution.extracandidatescount`.
	defaultExtraCandidatesCount = 1
)

type (
	// Distributor provides methods to determine the set of nodes for a stream.
	Distributor interface {
		// ChooseStreamNodes returns a set of `replFactor` nodes for the given streamID.
		ChooseStreamNodes(ctx context.Context, streamID StreamId, replFactor int) ([]common.Address, error)
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
		AddNewNode(operator common.Address, node common.Address)
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
	}

	// distributorImpl is designed to be immutable and thread-safe and contains the distributor state
	// and stream selection logic.
	distributorImpl struct {
		nodes     []*streamNode
		nodesMap  map[common.Address]*streamNode
		operators map[common.Address]struct{}
	}

	// streamsDistributor implements the Distributor interface and calculates a set of nodes to place
	// a stream on.
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
	// choose enough nodes. This can happen when the number of operational nodes is
	// less than the replication factor.
	ErrInsufficientNodesAvailable = RiverError(
		Err_BAD_CONFIG,
		"replication factor is greater than number of operational nodes",
	)

	_ Distributor          = (*streamsDistributor)(nil)
	_ DistributorSimulator = (*streamsDistributor)(nil)
)

// NewDistributor creates a new Distributor instance that calculates a set of nodes to place a stream on.
func NewDistributor(
	ctx context.Context,
	cfg crypto.OnChainConfiguration,
	blockNumber blockchain.BlockNumber,
	chainMonitor crypto.ChainMonitor,
	riverRegistry *registries.RiverRegistryContract,
) (Distributor, error) {
	impl, err := newImpl(ctx, riverRegistry, blockNumber)
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

	// update node registry state for stream node selection
	nodeRegistryChainMonitor := crypto.NewNodeRegistryChainMonitor(chainMonitor, riverRegistry.Address)
	nodeRegistryChainMonitor.OnNodeAdded(blockNumber+1,
		func(context.Context, *river.NodeRegistryV1NodeAdded) {
			d.Reload()
		})
	nodeRegistryChainMonitor.OnNodeRemoved(blockNumber+1,
		func(context.Context, *river.NodeRegistryV1NodeRemoved) {
			d.Reload()
		})
	nodeRegistryChainMonitor.OnNodeStatusUpdated(
		blockNumber+1,
		func(context.Context, *river.NodeRegistryV1NodeStatusUpdated) {
			d.Reload()
		},
	)

	// update internal statistic for stream node selection
	chainMonitor.OnContractWithTopicsEvent(blockNumber+1, riverRegistry.Address,
		[][]common.Hash{{river.StreamRegistry.ABI().Events["StreamUpdated"].ID}}, d.onStreamUpdate)

	return d, nil
}

func (d *streamsDistributor) ChooseStreamNodes(
	ctx context.Context,
	streamID StreamId,
	replFactor int,
) ([]common.Address, error) {
	impl := d.impl.Load()
	if len(impl.nodes) < replFactor {
		return nil, ErrInsufficientNodesAvailable
	}

	cfg := d.cfg.Get()
	extraCandidatesCount := int(cfg.StreamDistribution.ExtraCandidatesCount)
	if extraCandidatesCount <= 0 {
		extraCandidatesCount = defaultExtraCandidatesCount
	}

	// Select a node from required operators if configured
	requiredNode := selectRequiredOperatorNode(
		impl.nodes,
		cfg.StreamDistribution.RequiredOperators,
		cfg.StreamDistribution.MinBalancingAdvantage,
		cfg.StreamDistribution.MaxBalancingAdvantage,
		streamID,
	)

	// Calculate candidates count and determine if unique operators should be enforced
	candidatesWanted, uniqueOperators := calculateCandidatesCount(
		ctx, replFactor, extraCandidatesCount, len(impl.nodes), len(impl.operators),
	)

	// Select candidate nodes using pseudo-random selection
	candidates, candidatesFound := selectCandidateNodes(
		impl.nodes, streamID, candidatesWanted, uniqueOperators, requiredNode,
	)

	// Sort candidates by stream count (the least loaded first)
	slices.SortFunc(candidates[:candidatesFound], func(x, y *streamNode) int {
		return cmp.Compare(x.streamCount.Load(), y.streamCount.Load())
	})

	// Build final node list, ensuring required operator node is included
	return buildFinalNodeList(candidates[:candidatesFound], replFactor, requiredNode), nil
}

// selectRequiredOperatorNode selects a node from required operators using weighted scoring.
// Returns nil if no required operators are configured or none have operational nodes.
// minBalancingAdvantageBps and maxBalancingAdvantageBps are in basis points (e.g., 500 = 5%).
func selectRequiredOperatorNode(
	nodes []*streamNode,
	requiredOperators []common.Address,
	minBalancingAdvantageBps uint64,
	maxBalancingAdvantageBps uint64,
	streamID StreamId,
) *streamNode {
	if len(requiredOperators) == 0 {
		return nil
	}

	// Build set of required operators for O(1) lookup
	requiredOpSet := make(map[common.Address]struct{}, len(requiredOperators))
	for _, op := range requiredOperators {
		requiredOpSet[op] = struct{}{}
	}

	// Find all operational nodes belonging to required operators
	var requiredNodes []*streamNode
	for _, node := range nodes {
		if _, isRequired := requiredOpSet[node.Operator]; isRequired {
			requiredNodes = append(requiredNodes, node)
		}
	}

	if len(requiredNodes) == 0 {
		return nil // Graceful degradation: proceed with normal selection
	}

	// Apply defaults if not set
	if minBalancingAdvantageBps == 0 {
		minBalancingAdvantageBps = crypto.StreamDistributionMinBalancingAdvantageDefault
	}
	if maxBalancingAdvantageBps == 0 {
		maxBalancingAdvantageBps = crypto.StreamDistributionMaxBalancingAdvantageDefault
	}

	// Convert basis points to float64 percentages
	minAdvantage := float64(minBalancingAdvantageBps) / 10000.0
	maxAdvantage := float64(maxBalancingAdvantageBps) / 10000.0

	// Select using weighted scoring: score = hash_component + load_penalty
	// Lower score wins, so nodes with lower stream counts have an advantage.
	// The hash component provides pseudo-randomness based on (streamID, nodeAddress),
	// while the load penalty gradually biases selection toward less loaded nodes.
	//
	// Hash Distribution Guarantee:
	// The hash is computed from hash(streamID || nodeAddress). Although each node has a
	// fixed address, the streamID changes for every stream. Because xxhash thoroughly mixes
	// all input bits (avalanche effect), varying the streamID ensures each node's hash values
	// are uniformly distributed in [0, 1) over many streams. This means no node address can
	// cause a permanently skewed distribution - each node has equal base probability of winning
	// before load penalties are applied.
	//
	// Using float64 arithmetic to avoid overflow while supporting billions of streams.
	// Load penalty is calculated relative to the minimum stream count among required nodes,
	// ensuring the advantage is always in the configured range when stream counts differ.

	// Find minimum and maximum stream counts to calculate proportional penalties
	minStreamCount := requiredNodes[0].streamCount.Load()
	maxStreamCount := minStreamCount
	for _, node := range requiredNodes[1:] {
		count := node.streamCount.Load()
		if count < minStreamCount {
			minStreamCount = count
		}
		if count > maxStreamCount {
			maxStreamCount = count
		}
	}
	streamRange := maxStreamCount - minStreamCount

	var bestScore float64
	var selected *streamNode

	for i, node := range requiredNodes {
		h := xxhash.New()
		_, _ = h.Write(streamID[:])
		_, _ = h.Write(node.NodeAddress[:])

		// Normalize hash to [0, 1) range for comparable scaling with load penalty
		hashComponent := float64(h.Sum64()) / float64(math.MaxUint64)

		// Calculate load penalty proportionally based on position in the range
		// Node at min gets 0 penalty, node at max gets maxAdvantage penalty
		// Nodes in between are scaled proportionally
		streamDiff := node.streamCount.Load() - minStreamCount
		var loadPenalty float64
		if streamDiff > 0 && streamRange > 0 {
			proportion := float64(streamDiff) / float64(streamRange)
			loadPenalty = minAdvantage + (maxAdvantage-minAdvantage)*proportion
		}

		score := hashComponent + loadPenalty

		if i == 0 || score < bestScore {
			bestScore = score
			selected = node
		}
	}

	return selected
}

// calculateCandidatesCount determines how many candidates to select and whether
// to enforce unique operators. It favors operator diversity over load balancing.
func calculateCandidatesCount(
	ctx context.Context,
	replFactor, extraCandidatesCount, numNodes, numOperators int,
) (candidatesWanted int, uniqueOperators bool) {
	candidatesWanted = replFactor + extraCandidatesCount
	candidatesWanted = min(numNodes, candidatesWanted)
	uniqueOperators = candidatesWanted <= numOperators

	if !uniqueOperators && replFactor <= numOperators {
		// Ensure unique operators even if it means fewer extra candidates
		candidatesWanted = replFactor
		uniqueOperators = true
	} else if !uniqueOperators {
		logging.FromCtx(ctx).Warnw(
			"ChooseStreamNodes: replication factor is greater than number of unique operators",
			"replFactor", replFactor,
			"numOperators", numOperators,
		)
	}

	return candidatesWanted, uniqueOperators
}

// selectCandidateNodes selects candidate nodes using pseudo-random selection.
// If requiredNode is provided, it is included as the first candidate.
func selectCandidateNodes(
	implNodes []*streamNode,
	streamID StreamId,
	candidatesWanted int,
	uniqueOperators bool,
	requiredNode *streamNode,
) (nodes []*streamNode, candidatesFound int) {
	nodes = slices.Clone(implNodes)
	selectedOperators := make([]common.Address, 0, candidatesWanted)
	h := xxhash.New()

	// If we have a required operator node, add it as the first candidate
	if requiredNode != nil {
		for i, node := range nodes {
			if node.NodeAddress == requiredNode.NodeAddress {
				nodes[0], nodes[i] = nodes[i], nodes[0]
				break
			}
		}
		selectedOperators = append(selectedOperators, requiredNode.Operator)
		candidatesFound = 1
	}

	// Select remaining candidates pseudo-randomly
	for candidatesFound < candidatesWanted {
		_, _ = h.Write(streamID[:])

		// Pick a pseudo-random node from remaining nodes
		index := candidatesFound + int(h.Sum64()%uint64(len(nodes)-candidatesFound))
		selectedNode := nodes[index]

		// Check unique operators constraint
		if uniqueOperators && slices.Contains(selectedOperators, selectedNode.Operator) {
			// Swap invalid candidate with last node and truncate
			nodes[index] = nodes[len(nodes)-1]
			nodes = nodes[:len(nodes)-1]
			continue
		}

		// Valid candidate: move to front of remaining nodes
		nodes[candidatesFound], nodes[index] = selectedNode, nodes[candidatesFound]
		selectedOperators = append(selectedOperators, selectedNode.Operator)
		candidatesFound++
	}

	return nodes, candidatesFound
}

// buildFinalNodeList builds the final list of node addresses, ensuring the
// required operator node is included even if load balancing would exclude it.
func buildFinalNodeList(
	candidates []*streamNode,
	replFactor int,
	requiredNode *streamNode,
) []common.Address {
	addrs := make([]common.Address, 0, replFactor)
	requiredIncluded := requiredNode == nil

	for i := 0; i < len(candidates) && len(addrs) < replFactor; i++ {
		if requiredNode != nil && candidates[i].NodeAddress == requiredNode.NodeAddress {
			requiredIncluded = true
		}
		addrs = append(addrs, candidates[i].NodeAddress)
	}

	// If required node was excluded by load balancing, replace highest-load node
	if !requiredIncluded {
		addrs[len(addrs)-1] = requiredNode.NodeAddress
	}

	return addrs
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
		d.riverRegistry,
		blockchain.BlockNumber(header.Number.Uint64()),
	)
	if err != nil {
		d.nodeRegistryUpdated.Store(true) // reload next time this callback is called
		logging.FromCtx(ctx).Error("Unable to refresh stream distributor state", "err", err)
		return
	}

	d.impl.Store(impl)
}

// onStreamUpdate updates the node load figures each time stream is allocated or created.
func (d *streamsDistributor) onStreamUpdate(ctx context.Context, log *types.Log) {
	rr := d.riverRegistry
	event, err := river.StreamRegistry.UnpackStreamUpdatedEvent(log)
	if err != nil {
		logging.FromCtx(ctx).Errorw("Failed to unpack stream updated event", "err", err, "log", log)
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
				if node, found := impl.nodesMap[nodeAddr]; found {
					node.streamCount.Add(1)
				}
			}
		} else if reason == river.StreamUpdatedEventTypePlacementUpdated {
			newStream := event.(*river.StreamState)
			// load old stream record and decrease the node stream counters for all previous
			// nodes and increase the stream records counters for nodes in the new set.
			blockNumber := blockchain.BlockNumber(log.BlockNumber - 1)
			if oldStream, err := rr.StreamRegistry.GetStreamOnBlock(ctx, newStream.GetStreamId(), blockNumber); err == nil {
				for _, nodeAddr := range oldStream.Nodes {
					if node, found := impl.nodesMap[nodeAddr]; found {
						node.streamCount.Add(-1)
					}
				}
				for _, nodeAddr := range newStream.Stream.Nodes() {
					if node, found := impl.nodesMap[nodeAddr]; found {
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
	if n, found := d.impl.Load().nodesMap[node]; found {
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

func (d *streamsDistributor) AddNewNode(operator common.Address, node common.Address) {
	impl := d.impl.Load()
	impl = &distributorImpl{
		nodes:     slices.Clone(impl.nodes),
		nodesMap:  maps.Clone(impl.nodesMap),
		operators: maps.Clone(impl.operators),
	}

	streamNode := &streamNode{
		NodeRecord: registries.NodeRecord{
			NodeAddress: node,
			Operator:    operator,
			Status:      river.NodeStatus_Operational,
			Url:         fmt.Sprintf("https://%s.towns.com:443", node),
		},
		streamCount: atomic.Int64{},
	}

	impl.nodes = append(impl.nodes, streamNode)
	impl.nodesMap[node] = streamNode
	impl.operators[operator] = struct{}{}

	d.impl.Store(impl)
}

func (d *streamsDistributor) NodeStreamLoad(node common.Address) uint64 {
	impl := d.impl.Load()
	if streamNode, found := impl.nodesMap[node]; found {
		return uint64(streamNode.streamCount.Load())
	}
	return 0
}

func (d *streamsDistributor) SetNodeStreamLoad(load map[common.Address]uint64) {
	impl := d.impl.Load()
	for node, count := range load {
		if streamNode, found := impl.nodesMap[node]; found {
			streamNode.streamCount.Store(int64(count))
		}
	}
}

func newImpl(
	ctx context.Context,
	riverRegistry *registries.RiverRegistryContract,
	atBlockNumber blockchain.BlockNumber,
) (*distributorImpl, error) {
	// add all operational nodes to the distributor and map to streamNode records
	nodes, err := riverRegistry.GetAllNodes(ctx, atBlockNumber)
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Message("Failed to get all nodes")
	}

	// only consider operational nodes
	nodes = slices.DeleteFunc(nodes, func(node registries.NodeRecord) bool {
		return node.Status != river.NodeStatus_Operational
	})

	impl := &distributorImpl{
		nodes:     make([]*streamNode, 0, len(nodes)),
		nodesMap:  make(map[common.Address]*streamNode),
		operators: make(map[common.Address]struct{}),
	}

	for _, node := range nodes {
		streamCount, err := riverRegistry.StreamRegistry.GetStreamCountOnNode(ctx, atBlockNumber, node.NodeAddress)
		if err != nil {
			return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).Message("Failed to get node stream count")
		}

		streamNode := &streamNode{NodeRecord: node}
		streamNode.streamCount.Store(streamCount)

		impl.nodes = append(impl.nodes, streamNode)
		impl.nodesMap[node.NodeAddress] = streamNode
		impl.operators[node.Operator] = struct{}{}
	}

	return impl, nil
}
