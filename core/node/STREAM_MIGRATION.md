# Migrate streams from non-replicated to replicated streams
Towns launched initially with non-replicated streams. These streams need to be upgraded to migrated streams when replicated streams are supported.

Because replicated streams require a quorum of nodes that need have the stream into their local state this is a multi step process.

## Migration process
The Stream Registry smart contract keeps the list of nodes participating in a stream and a replication factor. During migration it is possible that the replication factor is lower than the number of nodes participating in the stream. In this case some nodes are called sync nodes. The role of these nodes it to sync the stream state into their local storage and track updates in anticipation of entering quorum later.

```
quorumNodes := stream.nodes[:replicationFactor]
syncNodes := streams.nodes[replicationFactor:]
```

In the following example stream `0x13832fce7587c4c19f41d75f09c0d82c1bbf73abd8a90d594734acefb121de7c` currently not replicated (replication factor=1) and managed by node `0xC6CF68A1BCD3B9285fe1d13c128953a14Dd1Bb60`. Nodes `0xB85dd7d21Bc093DAe6f1b56a20a45ec1770D11dD`, `0xDd5c1e1af10D47AC6859a494d7c1E4cb6a1DAB0d` and `0x553859AAC181c5568DaC867410698c586F3Cf1d3` are sync nodes in anticipation to join quorum.
```sh
$ ./env/omega/run.sh reg stream ffc002cdc0405c8b91c39e585b89edce854d7e0a0cc689a7bfd6b17f6dc40177
StreamId: ffc002cdc0405c8b91c39e585b89edce854d7e0a0cc689a7bfd6b17f6dc40177
Miniblock: 1 0x13832fce7587c4c19f41d75f09c0d82c1bbf73abd8a90d594734acefb121de7c
ReplFactor: 1
IsSealed:  true
Nodes:
  0 0xC6CF68A1BCD3B9285fe1d13c128953a14Dd1Bb60
  1 0xB85dd7d21Bc093DAe6f1b56a20a45ec1770D11dD
  2 0xDd5c1e1af10D47AC6859a494d7c1E4cb6a1DAB0d
  3 0x553859AAC181c5568DaC867410698c586F3Cf1d3
```

### Extract non-replicated streams
```sh
./env/alpha/run.sh stream not-migrated <output-stream-id-file> [max-streams] [node-address]
```
This will query the stream registry smart contract for all streams and only write streams with `len(stream.nodes) == 1` to the given output file. Optionally the number of written streams can be limited. Use -1 for no-limit (default). And optionally only match streams from a particular node (support stream migration from specific node).

The output file contains a json object per line with:
```json
{
  "stream_id": "20f01362cd20a58d812c12a13ba2119c2b9ac5857b4b581f7b37ef9cb92e8744",
  "replication_factor": 1,
  "status": "not_migrated",
  "node_addresses": [
    "0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60"
  ]
}
```
This file is the input to initiate the migration process.

### Initiate migration
This requires the output file generated in the previous step.
```sh
./env/omega/run.sh stream place initiate <wallet-file> <stream-id-file> <replication-factor>
```
The wallet needs to be funded with River Chain ETH and given the configuration manager role in the streams registry contract. The replication factor is the new replication factor, typically 3 but in some cases this can be 4 when a stream needs to be replicated and migrated away from a node to a different set of nodes.

Lets assume that the input file contains only 1 stream:

```json
{
  "stream_id": "20f01362cd20a58d812c12a13ba2119c2b9ac5857b4b581f7b37ef9cb92e8744",
  "replication_factor": 1,
  "status": "not_migrated",
  "node_addresses": [
    "0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60"
  ]
}
```

If this file is given as input the output after the following command was run: 
```sh
./env/omega/run.sh stream place initiate <wallet-file> <stream-id-file> 4
```
_(in this case 4 is selected because the stream will be migrated off from node `0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60` to a new set of nodes. This typically will be 3 to add 2 new nodes to the list that will participate in quorum)_

Will be a new file with the name `<stream-id-file>.initiated`
```json
{
  "stream_id": "20f01362cd20a58d812c12a13ba2119c2b9ac5857b4b581f7b37ef9cb92e8744",
  "status": "success",
  "tx_hash": "0x8addc7eb0cc50981509e674d434163814954e5b19e69bba630dfd62056b1e23d",
  "node_addresses": [
    "0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60",
    "0xb85dd7d21bc093dae6f1b56a20a45ec1770d11dd",
    "0x7645015ba222d5d0b473d05d246c54c4d289ba64",
    "0xfc224c846de2810c7c991fc34914def8bdaccc5e"
  ]
}
```
The smart contract emits a `StreamUpdated` event for each updated stream that contains the new set of nodes. Nodes that witness this event will determine the quorum and sync nodes, in the above example:
```
quorumNodes := [0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60]
syncNodes := [0xb85dd7d21bc093dae6f1b56a20a45ec1770d11dd,0x7645015ba222d5d0b473d05d246c54c4d289ba64,0xfc224c846de2810c7c991fc34914def8bdaccc5e]
```
If a node is in the quorum node list it will participate in quorum. In case a node is in the sync list it will schedule a stream reconcilation task to bring their local state up to date and track further updates.

> Important, migrating streams happens on a live system. Therefore the migration process needs to be paced to prevent the number of stream update transactions to fill up River Chain blocks or overwhelm nodes with reconcilation requests.

### Migration status
It takes some time before nodes have brought their local state up to date. Once nodes enter the quorum node the stream can only progress when enough nodes have synced up their state and can produce/vote on miniblock candidates. To see the if the sync nodes have synced the stream the following command can be used:

```sh
./env/omega/run.sh stream place status <initiated-file>
```
`<initiated-file>` is the output file from the previous step.

This will ask all stream nodes for their view on the stream through the `GetStream` grpc endpoint and write the status to an output file (given filename with `.status` appened to it). This file contains a json object per line with:
```json
{
  "stream_id": "20f01362cd20a58d812c12a13ba2119c2b9ac5857b4b581f7b37ef9cb92e8744",
  "Nodes": {
    "0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60": {
      "status": "success",
      "minipool_gen": 71
    },
    "0xb85dd7d21bc093dae6f1b56a20a45ec1770d11dd": {
      "status": "success",
      "minipool_gen": 71
    },
    "0x7645015ba222d5d0b473d05d246c54c4d289ba64": {
      "status": "success",
      "minipool_gen": 71
    },
    "0xfc224c846de2810c7c991fc34914def8bdaccc5e": {
      "status": "success",
      "minipool_gen": 71
    }
  }
}
```
In this case all nodes have a consistent view over the stream and have synced up. It is possible that some nodes are lagging behind if the reconcilation task failed because a node was down or due to some other issue.

### Bump stream to replicated stream
When the sync nodes have caught up it is possible to mark the stream as replicated by letting the sync nodes enter the stream quorum.

```sh
./env/omega/run.sh stream place enter-quorum <wallet-file> <status-file>
```
Make sure that the wallet has enough River Chain ETH and the configuration manager role in the stream registry.

