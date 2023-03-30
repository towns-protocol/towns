# Casablanca

Serge Khorun (serge@hntlabs.com)

# Overview

"Casablanca" is a code name for the web3 backend developed by HNT Labs for the Towns chat app. It includes a Node Network, Protocol and Client Library.

The Casablanca network consists of nodes run by independent operators. All nodes are homogeneous, i.e. perform same duties. Each node runs Casablanca node software that provides:

- Casablanca Chain - a proof-of-stake blockchain
- Storage Pool - storage for chat data
- Workflow logic for the chat application
- Validation for blockchain and chat data

There will be hundreds, and then thousands of nodes.

Casablanca clients connect to nodes and fetch conversation data, post new messages, etc.

The Towns chat app provides spaces (a.k.a. Towns) for communities. Each space contains channels. User can post messages to channels, invite other users to join, and so on. Permissions for spaces and channels are provided by smart contracts deployed to popular blockchains. This design allows novel crypto-native community entitlements. For example, community spaces can be gated by DAO membership or by NFT ownership.

The backend stores conversation data in streams. Each space has a `space` stream. Each channel has a `channel` stream. Each user has its own `user` stream. These are the only 3 types of streams accepted by the system.

Nodes expose stream-level APIs to clients. For example, the API allows clients to create streams, add events, read streams, etc. The client implements chat logic on top of this abstraction.

Streams are partitioned into chunks for storage purposes. Each chunk is copied to N nodes for redundancy and availability purposes. N is currently set to 5. This way each node in the network stores some subset of chunk copies. As a chunk gets full, a new chunk is allocated for the stream. Chunk copies are stored on a random set of nodes, and new updates to the stream are written to the new chunk.

A stream consists of events. An event is a basic update unit for the stream. Events contain payloads of various types, such as `message`, `join`, `invite`, `leave`, etc.

For example, to post a new message in a channel, the client app creates an event with the payload `message` and sends it to the node. Once the event is accepted by the node and stored into the stream's chunk, it is delivered to other client apps currently listening to this conversation.

All events are cryptographically signed. All events include the hash of the previous event in the signed data. This inclusion allows the backend and client to validate all events in the stream up to inception event. When two or more clients sign and send in new events simultaneously, branching in the stream may occur. Events that succeed such branches must include all known 'leaf' hashes. In other words, branching is allowed, but there are provisions to actively eliminate it.

When a client sends a new event to the node to be added to the stream, the receiving node runs a permission check to determine if the event creator, as determined by the signature, has the right to post the event with that specific payload to the given stream.

Permissions (entitlements) are provided by smart contracts running on external blockchains, e.g. Ethereum mainnet, Polygon, etc. A node reads entitlements from smart contracts to check if the operation encoded in the new event sent by the user is permitted. Other roles, such as owner, moderator and so on are recorded in these smart contracts as well. For example, if a space is gated by a specific NFT, the user should be an NFT holder in order to join. If user A bans user B from a space, user A should have moderator permission and user B should not be the owner of the space.

All nodes run Casablanca Chain, a blockchain constructed by a fork of Ethereum software. The Casablanca Chain contains:

- A list of nodes
- A list of all streams in the system
  - Chunk info for each stream
  - A list of chunk copies
  - The last known leaf hashes for each stream

Data is stored in EVM smart contracts with custom extensions.

As a stream grows, nodes hosting this stream periodically commit last known leaf hashes to Casablanca Chain. This _canonicalizes_ these new events.

Proof-of-Stake validation logic is extended to validate stream data as well:

- When a client sends a new event to a node to append it to a stream, the node runs validity and permission checks. If the event is accepted, the node broadcasts it to the other nodes hosting this stream and commits it to local storage.
- Periodically, nodes posts transactions that contain the last known leaf hashes for the updated stream.
- A block proposer builds the current block and checks if the transition described in a transaction is valid by running same the checks as the node that sent the transaction to the mempool.
- Other nodes receive the new beacon block. Validators re-execute the check locally and attest whether the block is valid.

On top of that, validators are tasked with periodic scrubbing of other nodes to ensure that they retain stream data they must host and are available.

Casablanca Chain is secured by stakes bridged from the Ethereum mainnet (or other major blockchains). Rewards and slashes are transferred from Casablanca Chain back to the mainnet.

# Design Considerations

## Redundancy

Since any node can disappear from the network at any time, stored data needs to be replicated across multiple nodes. However, it is impractical and cost-prohibitive to replicate all data to all nodes. Thus each piece of data is going to be replicated only to a subset of storage nodes.

## Consensus

Blockchains achieve consensus in a distributed untrusted environment.

In traditional distributed storage systems, consensus is achieved using consensus algorithms such as Paxos, or, lately, Raft. In blockchain-based systems, the blockchain provides consensus, so there is no need for using additional consensus algorithms.

Unlike traditional systems, in a blockchain system nodes can be actively malicious. While this appears to be a critical difference, in practice due to software bugs, hardware problems, data corruptions and networking issues, traditional distributed storage systems have to treat nodes as unreliable and “untrusted”, if not actively malicious.

## Time

It’s challenging to keep clocks synchronized in a distributed system. To provide a coarse unit of timing and sequencing, blockchain block number is used as a time-stamping primitive. As such, nodes can reject new objects/events/transactions which are stamped as being from the future or too far from the past.

## Randomness

The beacon chain provides a new random number every epoch through the RANDAO mechanism. So it’s possible to perform random, but deterministic operations every epoch, such as choosing storage nodes for new chunks, etc.

## Global Settings

All nodes maintain the same configuration parameters that can be updated based on the future block number a-la Ethereum fork settings.

Some settings are controlled by DAO and are stored in the smart contract on the Casablanca Chain.

## Blockchain and Reality

A basic design principle of the system is that the blockchain describes what reality should look like, and nodes work to bring what they observe into compliance with blockchain records. If they fail to do so, their stakes get slashed.

For example, a node can be assigned to host a copy of a specific chunk. This assignment is stored on-chain. The node has some time to copy this chunk from other nodes. If the validation process detects the absence of the chunk copy on the node later, the node’s stake is partially slashed.

# Events and Streams

## Event

Event is a basic update unit in Casablanca Network. Each event belongs to a specific stream. All updates are expressed as an event of particular kind, for example:

- To post new message to a channel, client library sends request to the backend to add new event to the channel stream.
- Invite to join channel from one user to another is represented by two events: one in the channel stream and another is the user stream.
- Creation of new channel in a space is done by posting a channel creation event to the space stream.

Event is identified by its hash.

Event is immutable and signed by its creator. Client or node can create events.

Event contains payload. Event type is determined by the kind of payload it contains.

Event contains "very recent" block number at the time of its creation.

## Stream

Stream consists of events. Each space, channel and user have corresponding streams.

Stream starts with inception event (this is only event type that should not include hashes of preceding events).

Events in a stream are partially ordered. All events (except inception) must reference preceding events by including their hashes is in the signed payload. When new event is created by a client or node, it must include hashes of all known events that are not already included by other events. Events that are not yet referenced by subsequent events are called _leaf events_, their hashes are called _leaf hashes_. I.e. when new event B is appended to the stream, it must reference last known leaf event A, at which point B becomes new _leaf event_, and A ceases to be so.

Multiple clients can append new events to the stream simultaneously. In this case each of them will reference latest leaf event known to them locally, and multiple leaf events will be appended to the stream. As such, stream can have _multiple leaf hashes_.

Due to this design events in a stream form _connected directed acyclic graph_ (DAG). This design allows fast stream updates, but creates additional complexity for managing canonical stream view. For example, client can send a "side chain" of events that alter conversation too far in the past. Nodes have provisions for rejecting such updates from the canonical view of the steam. Due to this DAG “tries” to converge to just a chain as long as there are not that many simultaneous appends (More below TODO: section link)

> NOTE: Alternative design would be to require streams to be strongly ordered. This would naturally limit potential update rate, making app unable to timely post new messages if conversation is very popular.

For storage purposes streams are partitioned into the chunks.

Stream has a unique id. Casablanca chain contains a record that maps stream_id => (list of chunks_ids, hashes of current stream heads).

# Stream Storage

## Storage Pool

All nodes on the network form a storage pool. In the future versions, the network can be partitioned into multiple pools for performance reasons.

Storage pool stores chunks. Chunk is an allocation and replication abstraction. Each chunk is replicated to a predetermined, but different set of nodes. There are many more preallocated chunks than storage nodes. Each storage node contains replicas of multiple chunks.

In the event of storage node failure, all chunks that were stored on the failed node are replicated to other nodes to achieve the required replication factor (obviously they are replicated from still available nodes holding replicas of these chunks). Since each chunk is placed on a distinct subset of nodes, replication downloads data from all nodes in the network equally without overloading a single node.

Replication factor is set to 5. I.e. each chunk has 5 replicas containing same data stored on different nodes. As network grows this parameter can be adjusted to balance cost and reliability.

## Chunks

Each stream is partitioned into chunks for storage purposes. Chunk is storage and replication abstraction and logical stream view is unaffected by underlaying chunks. Stream events are added to first stream chunk, once it reaches certain size, new chunk is allocated and subsequent events are added to the new chunk, and so on.

Each chunk has a unique id. Blockchain contains mapping of chunk_id => set of storage node addresses.

To access a chunk, a chunk record is retrieved from the blockchain. Node addresses are mapped to ENR records. ENR records contain ess_ip and ess_port for communication with node.

> NOTE: Current version of specification introduces replicated chunks. In the future chunks can also be erasure-encoded.

## Chunk Allocation

New chunk is required during stream creation or if last chunk of the stream if full and stream needs new chunk.

New chunk is deterministically allocated to N nodes using RANDAO random number, current block number and hash of the first event in the chunk. Specifically, input data is hashed together and then result is used to deterministically select nodes from the list of all nodes in the system. First event in the chunk is inception event during stream creation or first event that didn't 'fit' into previous chunk.

Node that receives stream creation API request (or creates new chunk due to the fullness of previous chunk) creates a transaction for chunk smart contract using rules outlined above. Posts transaction into mempool. And sends transaction and inception event to the nodes chosen for the allocation. Target nodes validate tx and optimistically create chunk in the local storage and save received event. This is done to speed up creation process, i.e. there is no need to wait for block to advance.

In practice it's safe since if chunk creation tx doesn't make it to the block for whatever reason, node that optimistically created chunk locally will notice the discrepancy and would remove the chunk that it doesn't have to host. I.e. node always tries to bring local storage in the same state as described on chain.

For client and nodes not participating in the transaction directly there is a delay before creation tx for both stream and chunk is committed on chain and thus stream and chunk can be discovered by their ids. Client and node code should handle situation when stream and chunk are discovered through other means (for example, client receives invite to join freshly create channel), but not yet discoverable on chain by waiting for two blocks to advance before giving up.

To reason about what should be in the chunk, chunk is sealed by node by special [drain event](#drain-events). I.e. chunk sealing drain event indicates end of the chunk. Events in the next chunk reference this last event and cannot reference other events in the preceding chunk.

## Rebalancing

At the beginning of each epoch single node is selected using RANDAO to perform re-balancing task. It runs through all chunks and nodes in the system and deterministically rebalances them.
Purpose of rebalancing is to spread load equally through the system. I.e. all nodes should host approximately same number of chunk replicas.

Failure to perform rebalancing is slashable offense. Rebalancing txs are deterministic and validated by following same rules as to produce them.

In the future versions this task will be partitioned across all bocks in the few consecutive epochs and multiple nodes to reduce both load on the nodes and blockchain.

Node monitors allocation transactions on blockchain and if relevant to itself changes of allocation are noticed, node brings local storage to match view on the blockchain. I.e. if node has unneeded chunk replica it deletes it from the local storage, and if node is missing required chunk replica it downloads it from nodes that have it.

Chunk record on the smart contract contains list of nodes that host chunk replicas and statuses of each replicas. Replica statuses are `live`, `new`, `leaving`, `dead`.

Rebalancing request updates chunk record to contain `new` replica and changes one of existing replicas to `leaving` . New replica's host has a grace period during which it should download chunk from `leaving`, or if not available, from `live` nodes and mark its chunk replica record on the smart contract as `live`.

During next rebalancing round rebalancer notices that now chunk has enough `live` replicas and removes `leaving` replica record. Host of `leaving` replica notices changes and removes unneeded replica from local storage.

Rebalancer always keeps at least `N` (as determined by global network settings, initially set to 5) replicas available. I.e. `live` + `leaving` number should never go below N and there should always be as many `new` replicas as `leaving` (strictly speaking `new` should be equal to `live` + `leaving` - `N`).

Nodes should prioritize downloading of chunks that have smallest number of `live` replicase. I.e. to reduce probability of data loss it's important to restore chunk that has one `live` faster than chunk with four `live` replicas.

## Joining Storage Pool

When new node joins storage pool, its local storage is empty. To perform it's fair share of work in need to receive some chunk replicas, so load on all nodes in the network is equal.

[Rebalancer](#rebalancing) notices new nodes and move some chunks to it through rebalancing process. During each rebalancing period limited number of chunks is moved to the new node to avoid overwhelming it and giving it a chance to complete transfer in the grace period.

## Voluntarily Leaving Storage Pool

Node can voluntarily leave Casablanca Network by unstacking. Unstacking consists of two periods: during _grace period_ node continues to receive rewards and unstacking decision can be reversed by node operator. After _grace period_ is over, node stop receiving rewards and _evacuation period_ starts. During _evacuation period_ node does not receive rewards, but must stay online to avoid slashing. At the start of _evacuation period_ node is marked as `leaving` and [rebalancing process](#rebalancing) marks batches of node's chunks replicas as `leaving`. Replicas are marked in batches to avoid overload of the node.

Once all chunks are transfered, node can leave network without slash penalty.

## Involuntarily Leaving Storage Pool

If node is unavailable for extended period of time, it is declared as `dead` (see [#Validation of Stream Storage](#validation-of-stream-storage)). [Rebalancer](#rebalancing) notices `dead` node and marks all node's chunk replicas as `dead` which leads to allocation of the `new` replicas.

Node being `dead` incurs slash penalty. If node comes back from the `dead`, its chunks are marked as `alive` again.

## Request Relaying

Since number of allowed connections from the web app is limited by the browser, client cannot connect to any node in network as required without loosing connections to other nodes. To resolve this issue nodes relay client requests to other nodes if streams in question are not hosted by them.

To mitigate malicious node behaviors client periodically drops connection to the current node and moves traffic to the other node in the network.

# Stream Update Process

## Drain Events

There are situations when it's desirable to have only one leaf event in the stream to simplify reasoning. For example, [chunk sealing](#chunk-allocation), [snapshots](#snapshot-events) or [entitlement update](#entitlements).

These types of events designated as `drain` events. Once such event is produced, all subsequents events should reference it or its descendants. Node rejects new events that reference events proceeding to last drain event, and client should regenerate such events with new leaf hashes and resend them.

## Snapshot Events

Streams are loosely append-only. Although it's possible to generate event which references some older event in stream, there is time out after which such events are rejected. I.e. event can't be inserted too far back.

There is a desire to discard old events since old messages are less valuable in the context of the chat application and there is a need to limit cost for the free streams. But administrative events, such as `join`, `leave`, `set stream name` can't be freely discarded without state loss.

To address this `snapshot` events are introduced. Preceding events are "rolled up", for example `join` and `leave` events are rolled up into the `membership roster`. Snapshot event is [drain event](#drain-events). Snapshot event includes a copy of stream inception event.

Once snapshot event is added to the stream, preceding events can be safely garbage collected.

Snapshot event is produced by the node. It follows normal validation logic for other stream updates.

`message` events are not rolled up into snapshots.

## Publishing Leaf Hashes on Chain

Nodes hosting given stream rotate the duty of publishing latest leaf hashes on chain based on the number of new events.

Lets say [setting](#global-settings) is set to publish every 100 events, nodes A, B, C, D, E host last chunk of the stream S and node E just sent tx with new leaf hashes. Then node A must sent tx after 100 new events, node B after 200 new events, node C after 300 new events and so on. Node be must send tx on schedule even if node A fails to send its tx. This prevents malicious node from stalling the process. Missing to send the tx is slashable offence.

Node that must send out tx at the current round is called the `leader`. Leader node queries hashes of new events from the other nodes and selects leaf hashes that are present on the majority of nodes (i.e. on the 3 out of 5 in the example above). Then other nodes sign the message that they have these hashes and leader submits new "latest leaf hashes tx". Transaction contains the leaf hashes and signatures of the leader (by definition) and at least of the other 2 nodes (in case of replication set to 5).

# Validation

## Staking

Casablanca network is secured by stakes. Node operators place stakes on external network that are bridged to the Casablanca network. Rewards and slashed are bridged back from Casablanca Chain.

Exact staking size, penalties and rewards are controlled by DAO.

All nodes periodically receive same reward that covers periodic reward set by DAO as network setting and average expended [gas](#gas).

## Validation of Stream Creation

Validation largely happens in the same way as on Ethereum network with custom extensions to recognize and validate `latest leaf hash` transactions and to periodically test node's availability:

As client sends new events for the given stream to the node, node broadcasts these updates to other nodes hosting this steam. These events are not yet _canonicalized_. Periodically node creates a transaction that contain latest known leaf hashes (see [#Stream Update Process](#stream-update-process)) to canonicalize latest events. Such transaction does not include hashes of all new events, only of the leaf new events: since all non-leaf events are by definition referenced by leaf events, committing hashes of latest leaf events is enough to canonicalize all preceding events in the stream.

Then validation follows normal Ethereum approach:

- Periodically node posts transaction that contains last known leaf hashes for updated stream.
- Block proposer builds the current block and checks if transition described in transaction is valid by running same checks as node that sent transaction to the mempool.
- Other nodes receive the new beacon block. Validators re-execute check locally and attest if block is valid.

> NOTE: There are throughput challenges here: both block proposer and validators need to re-execute checks to validate proposed stream updates. This naturally puts a limit on home many "leaf hashes updated" transactions can be put in the each block. Initially this can be mitigated by reducing update frequency for each individual stream. Then there are two avenues for mitigating this:
>
> - Partitioning of duties. Specifically, when Beacon chain gets sharding, Casablanca can just reuse it.
> - Vouching schemas where each transaction is not validated by all participants, but later statistically validated with sampling and transaction proposer is penalized if bay transaction is found. This is possible to implement in Casablanca since all transactions are proposed by staking nodes.

## Validation of Stream Storage

Each epoch, using RANDAO some nodes are designated as scrubbers and some chunks are selected for scrubbing.

Scrubbers read chunks and cast votes about chunk availability in form of transactions. If the time period some node gets too many negative votes, penalty is issued against it's stake.

If node is unavailable for extended period of time, it is declared `dead` and chunks hosted on it are replicated to other nodes ([Rebalancing](#rebalancing)).

All settings for this process are controlled by [Global Settings](#global-settings).

> TODO: design specifics to mitigate malicious behaviors when nodes are not storing data and always try to read it from other replicas. Possible mitigations: making each event replica unique for each node, so they can't read from the other node; "black outs" when replica is scrubbed so other nodes do not server this replica during black out, etc.

# Identity

Casablanca users are identified by their crypto address. Specifically, Casablanca client creates new keypair for each user - _Casablanca Key Pair_. This key pair is used to sign user messages. It can be backed using phrase mnemonic and restored to other device as any other crypto key pair.

To claim Ethereum or other network entitlements user may sign their public key with their Ethereum wallet (i.e., _Metamask_ and so on) . This action "chains" key pairs and allows Casablanca backend to apply entitlements of user's wallet to their Casablanca account. More than one wallet can be connected this way to Casablanca account.

# Workflows

## Entitlements

It is computationally expensive for nodes to check entitlements on receiving of every event. As such, entitlements are checked when `join` event is being appended to the stream.

Once corresponding event is the stream user is allowed to perform the action. For example, once user joined, they can send new messages to the stream.

To detect changing entitlements periodic entitlement check are run on the stream's roaster. Detected changes are reflected in the stream by appending new events.

Streams and nodes to run these checks are selected using RANDAO similar to [scrubbing](#validation-of-stream-storage) based on [settings](#global-settings).

This design means that there is a grace period when user does not have an entitlement anymore but still can perform the entitled action.

To address needs of the moderators bans and kicks are implemented by separate events and take the force immediately. Banned users cannot rejoin the stream even if the still have or reacquire the entitlement.

> TODO: more about joins and entitlements for different roles, etc.

> TODO: more client and server chat workflows

> TODO: `fuel` scenarios

# Casablanca Chain

## Gas

Nodes produce transactions to be posted on the Casablanca Chain. External transactions are not allowed. However chain still needs to be secured from malicious node behavior.

Nodes pay gas fees to post transactions. Average gas fees are returned as part of the reward. I.e. total reward payout is adjusted to cover both APR reward and estimated gas fees payed by the node during the reward period.

# FAQ

> TODO
