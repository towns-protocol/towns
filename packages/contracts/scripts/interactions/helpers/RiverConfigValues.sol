// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library RiverConfigValues {
    bytes32 public constant ENABLE_NEW_SNAPSHOT_FORMAT =
        keccak256("stream.enablenewsnapshotformat");
    bytes32 public constant XCHAIN_BLOCKCHAINS = keccak256("xchain.blockchains");
    bytes32 public constant NODE_BLOCKLIST = keccak256("node.blocklist");
    bytes32 public constant STREAM_MINIBLOCK_REGISTRATION_FREQUENCY =
        keccak256("stream.miniblockregistrationfrequency");
    bytes32 public constant STREAM_REPLICATION_FACTOR = keccak256("stream.replicationfactor");
    bytes32 public constant MEDIA_CHUNK_SIZE = keccak256("stream.media.maxchunksize");
    bytes32 public constant MEDIA_CHUNK_COUNT = keccak256("stream.media.maxchunkcount");
    bytes32 public constant ENABLE_NODE_2_NODE_AUTH = keccak256("server.enablenode2nodeauth");
}
