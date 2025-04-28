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
./env/alpha/run.sh stream not-migrated-all <output-directory>
```
This will query the stream registry smart contract for all streams and only write streams with `len(stream.nodes) == 1`. It writes these matched streams to output files in the given directory with `<node_address>_<stream_type>`.

```
0xe98ea85dc784723c684c992484f586d96820c264_a5.streams
0xe98ea85dc784723c684c992484f586d96820c264_10.streams
0x9c2cc27b2d73cfcc3e5b1a9d884253eec17b626c_20.streams
0x3647cdefe73995ad6c17767db117608c3f79cb63_ff.streams
0x3647cdefe73995ad6c17767db117608c3f79cb63_10.streams
...
```

The output files contain a json object per line with:
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
Each file is the input to initiate the migration process. Files can be concatenated to migrate streams from multiple types or nodes at once.

### Initiate migration
This requires the output file generated in the previous step.
```sh
./env/omega/run.sh stream place initiate <wallet-file> <streams-file> <replication-factor>
```
The wallet needs to be funded with River Chain ETH and given the configuration manager role in the streams registry contract. The replication factor is the new replication factor, typically 3 but in some cases this can be 4 when a stream needs to be replicated and migrated away from a node to a different set of nodes. The streams-file is one of the files generated in the previous step (or a combined file manually created by concatenation multiple files into one).

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
./env/omega/run.sh stream place initiate <wallet-file> <streams-file> 4
```
_(in this case 4 is selected because the stream will be migrated off from node `0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60` to a new set of nodes. Replication is usually 3 when replicating a stream from an existing node over 2 additional._

The output is a file names `<streams-file>.initiated`
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
The smart contract emits a `StreamUpdated` event with the new node list for each updated stream that contains the new set of nodes. The replication factor isn't changes in the registry and thus remains 1 for now. Nodes that witness this event will determine the quorum and sync nodes, in the above example:
```
quorumNodes := [0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60]
syncNodes := [0xb85dd7d21bc093dae6f1b56a20a45ec1770d11dd,0x7645015ba222d5d0b473d05d246c54c4d289ba64,0xfc224c846de2810c7c991fc34914def8bdaccc5e]
```
If a node is in the quorum node list it will participate in quorum. In case a node is in the sync list it will schedule a stream reconcilation task to bring their local state up to date and track further updates.

> Important, migrating streams happens on a live system. Therefore the migration process needs to be paced to prevent the number of stream update transactions to fill up River Chain blocks or overwhelm stream nodes with reconcilation requests. This is done by submitting transactions to update the Stream Registry paced.

### Migration status
Before nodes can participate in the stream quorum and vote/create miniblock candidates they need to have their local storage up to date. To see the if the sync nodes have synced the stream use the status subcommand:

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
In this case all nodes have a consistent view over the stream and have synced up. It is possible that some nodes are lagging behind if the reconcilation task failed or only partially succeeded. The migration software will detected this when bumping the stream to a replicated stream and will print the streams that have not synced by all nodes to the console and exists without making modifications. This allows for manually intervention to ensure that all nodes have synced the stream.

### Bump stream to replicated stream
When the sync nodes have caught up it is possible to mark the stream as replicated by entering the sync nodes into the streams quorum.

```sh
./env/omega/run.sh stream place enter-quorum <wallet-file> <status-file>
```
Make sure that the wallet has enough River Chain ETH and the configuration manager role in the stream registry.

The output of this command is a file named `<status-file>.enter_quorum`. Each line is a json object:

```json
{
  "stream_id": "20f01362cd20a58d812c12a13ba2119c2b9ac5857b4b581f7b37ef9cb92e8744",
  "status": "success",
  "tx_hash": "0xa3009305db9980b0b1cb3c9003606dffea1894faed9ccf6df65af80afa3b41a8",
  "node_addresses": [
    "0xb85dd7d21bc093dae6f1b56a20a45ec1770d11dd",
    "0x7645015ba222d5d0b473d05d246c54c4d289ba64",
    "0xfc224c846de2810c7c991fc34914def8bdaccc5e",
    "0xc6cf68a1bcd3b9285fe1d13c128953a14dd1bb60"
  ]
}
```
In this case a stream is not only migrated to a replicated stream but also migrated away from a node. Therefore there are 4 nodes in the list from which the last node is just a sync node. The final step it to remove the last node from the node list.

For streams from non-replicated streams to replicated streams the migration is finished.