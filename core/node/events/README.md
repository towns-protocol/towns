
# Replicated streams

To ensure stream availability streams will be replicated over a configurable number of nodes. This number is
stored on-chain in the River Registry Config facet under the `stream.replicationFactor` config key. Events added
to a stream are aggregated in mini-blocks. An event first enters the mini-pool and when it is time for the next
mini-block are promoted from the mini-pool to the new mini-block. Each mini-block is produced on top of the
previous mini-block and form a canonical chain of blocks and events that ensures ordering and a consistent view
over a stream.

## Mini-block production
Each stream starts with a genesis block and is registered in the River Registry Stream facet. The contents
of the mini-block depends on the stream type. With the stream allocated in the streams registry clients can
start adding events to it by calling the `AddEvent` rpc endpoint. The node will:

1. verify the event
2. add the event to its internal stream minipool if the node is partipating in the stream
3. forward the event to other nodes participating in the stream

In the background each node listens for new blocks on the River chain. When a new River Chain Block is added
the internal chain monitor calls a callback in the node that loops over the streams that it is participating in. Streams
that have events in their mini-pool are marked as a candidate for mini-block production.

### Leader selection
After all stream mini-block candidate streams are collected streams for which the current node isn't the leader are
ignored. The algorithm to determine if a node is the leader on the current River Chain block is:
```
nodes := stream nodes in the same order as registered in the Stream facet
leader := nodes[RiverChainBlockNumber % stream.replicationFactor]
isLeader := leader == node_address
```

### Miniblock candidates
For mini-block stream candidates for which the node is the leader it tries to schedule a mini-block creation job. This job performs the following tasks:

#### Create mini-block proposal
1. create proposal from its internal stream mini-pool
2. request proposals from remote nodes participating in the  stream through the grpc endpoint
   `ProposeMiniblock` that accepts the stream id from which to produce a proposal. Remote proposals
   are ignored when they don't have the expected mini-block number or are not built on top of the current
   stream mini-block head.
3. Combines the local and remote proposals into a mini-block candidate that contains
   events that have reached quorum (more than half of the nodes included an event in their proposal). Set   `ShouldShapshot` in the mini-block proposal to true if quorum has reached
   if this mini-block must contain a snapshot.
* _events that reached quorum but are not available in the leader node when the proposals are combined are ignored at the moment_

If the combined mini-block doesn't contain events nor has the `ShouldSnapshot` indication set to true
the job finishes.

#### Mini-block proposal to candidate
1. create mini-block header that contains the mini-block number, the hash of the previous mini-block, snapshot if `proposal.ShouldSnapshot`, timestamp, event hashes from included events, previous mini-block snapshot number
2. MiniblockInfo structure that includes the mini-block header and events

This candidate is stored in the nodes local database and send to all other participating nodes through the
grpc endpoint `SaveMbCandidate`.

#### Mini-block candidate promotion
The last step for a mini-block candidate before it is added to the streams canonical mini-block stream is to register the mini-block in the River Registry Stream facet. To reduce the number of transaction the node gathers mini-block candidates and registers them in batches. It monitors the results of a registration
by inspecting the reaised logs and promotes mini-block candidates from the database to mini-block when
it got the log from the Stream facet that mini-block candidate registration was successful.

Batch registrations happens either when enough candidates are collected or when 1/4 of the River Chain block period was passed.
