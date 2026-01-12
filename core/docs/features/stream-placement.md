# Stream Placement

## Overview

Stream placement is the process of selecting which nodes should host a new stream. The placement algorithm balances streams across available nodes while respecting operator diversity constraints and required operator requirements.

This feature is implemented in the `streamplacement` package and is used when creating or allocating new streams.

## Node Selection Goals

The stream placement algorithm aims to achieve several goals:

1. **Even distribution**: Streams should be evenly distributed across all operational nodes
2. **Operator diversity**: Streams should be placed on nodes from different operators when possible
3. **Required operators**: When configured, at least one node from a required operator must be included
4. **Load balancing**: Less loaded nodes should be preferred over more loaded nodes

## Replication Factor

Each stream is replicated across multiple nodes for fault tolerance. The replication factor determines how many nodes will host each stream.

The placement algorithm selects exactly `replFactor` nodes for each stream.

## Candidate Selection

The algorithm selects more candidates than needed (`replFactor + extraCandidatesCount`), then picks the least loaded nodes from those candidates.

This approach provides load balancing while maintaining deterministic, pseudo-random selection based on the stream ID.

## Operator Diversity

When there are enough unique operators, the algorithm ensures that selected nodes come from different operators. This prevents a single operator failure from affecting stream availability.

If the replication factor exceeds the number of unique operators, multiple nodes from the same operator may be selected, and a warning is logged.

## Required Operators

Required operators is an on-chain setting that specifies a list of operator addresses. When configured, at least one node from a required operator must be included in each stream placement.

### Weighted Scoring

Selection among required operator nodes uses weighted scoring:

```
score = hash_component + load_penalty
```

- **hash_component**: Pseudo-random value in [0, 1) based on `hash(streamID || nodeAddress)`
- **load_penalty**: Proportional penalty based on node's stream count relative to min/max among required nodes

The node with the lowest score wins. This provides:
- Deterministic selection (same streamID always selects same node)
- Uniform base distribution (no node address causes permanent bias)
- Gradual load balancing (less loaded nodes have higher win probability)

### Load Balancing Range

The load penalty is configured via on-chain settings:
- **MinBalancingAdvantage**: Minimum advantage for less-loaded nodes (default: 5%)
- **MaxBalancingAdvantage**: Maximum advantage for less-loaded nodes (default: 7.5%)

Nodes are penalized proportionally based on their position between min and max stream counts.

### Graceful Degradation

If no required operator has operational nodes available, the algorithm proceeds with normal selection without error. This ensures stream creation is not blocked by required operator misconfiguration.

## Implementation References

- **Distributor interface**: `core/node/nodes/streamplacement/distribution.go:37` defines the `Distributor` interface with `ChooseStreamNodes` method.
- **Main selection logic**: `core/node/nodes/streamplacement/distribution.go:161` implements `ChooseStreamNodes`, orchestrating candidate selection and final node list building.
- **Required operator selection**: `core/node/nodes/streamplacement/distribution.go:208` implements weighted scoring for selecting among required operator nodes.
- **Candidate count calculation**: `core/node/nodes/streamplacement/distribution.go:314` determines how many candidates to select and whether to enforce unique operators.
- **Pseudo-random candidate selection**: `core/node/nodes/streamplacement/distribution.go:339` selects candidate nodes using deterministic pseudo-random selection based on stream ID.
- **Final node list building**: `core/node/nodes/streamplacement/distribution.go:389` builds the final node list, ensuring required operator node is included.
- **Configuration settings**: `core/node/crypto/config.go:303` defines `StreamDistribution` struct with `ExtraCandidatesCount`, `RequiredOperators`, `MinBalancingAdvantage`, and `MaxBalancingAdvantage` fields.
- **Default values**: `core/node/crypto/config.go:100` defines default balancing advantage values (500 = 5%, 750 = 7.5% in basis points).
- **Node registry updates**: `core/node/nodes/streamplacement/distribution.go:139` subscribes to node registry events to reload distributor state when nodes join/leave.
- **Stream count tracking**: `core/node/nodes/streamplacement/distribution.go:437` updates node stream counts from `StreamUpdated` events.
- **Test coverage**: `core/node/rpc/stream_distribution_test.go:310` tests required operators with 0, 1, 2, and 3 required operators. `core/node/rpc/stream_distribution_test.go:450` tests graceful degradation when required operators have no operational nodes.
