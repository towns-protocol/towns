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

```text
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

### Core Components

| Component | Location | Description |
|-----------|----------|-------------|
| `Distributor` interface | `streamplacement/distribution.go` | Defines `ChooseStreamNodes` method for stream placement |
| `ChooseStreamNodes` | `streamplacement/distribution.go` | Main entry point orchestrating candidate selection |
| `selectRequiredOperatorNode` | `streamplacement/distribution.go` | Weighted scoring for required operator node selection |
| `calculateCandidatesCount` | `streamplacement/distribution.go` | Determines candidate count and operator diversity enforcement |
| `selectCandidateNodes` | `streamplacement/distribution.go` | Pseudo-random candidate selection based on stream ID |
| `buildFinalNodeList` | `streamplacement/distribution.go` | Builds final node list ensuring required operator inclusion |

### Configuration

| Component | Location | Description |
|-----------|----------|-------------|
| `StreamDistribution` struct | `crypto/config.go` | Configuration fields for stream placement |
| `StreamDistributionMinBalancingAdvantageDefault` | `crypto/config.go` | Default min advantage (500 = 5%) |
| `StreamDistributionMaxBalancingAdvantageDefault` | `crypto/config.go` | Default max advantage (750 = 7.5%) |

### Event Handling

| Component | Location | Description |
|-----------|----------|-------------|
| `onNodeRegistryChanged` | `streamplacement/distribution.go` | Reloads distributor state when nodes join/leave |
| `onStreamUpdated` | `streamplacement/distribution.go` | Updates node stream counts from stream events |

### Tests

| Test | Location | Description |
|------|----------|-------------|
| `TestRequiredOperators` | `rpc/stream_distribution_test.go` | Tests 0, 1, 2, and 3 required operators |
| `TestRequiredOperatorsGracefulDegradation` | `rpc/stream_distribution_test.go` | Tests fallback when required operators have no nodes |
