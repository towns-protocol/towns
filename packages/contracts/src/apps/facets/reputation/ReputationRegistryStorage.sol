// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

library ReputationRegistryStorage {
    struct Layout {
        // feedback schema ID
        bytes32 feedbackSchemaId;
        // response schema ID
        bytes32 responseSchemaId;
        // agentId => clientAddress => last feedback index
        mapping(uint256 => mapping(address => uint64)) lastIndex;
        // agentId => clientAddress => feedback index => attestation ID
        mapping(uint256 => mapping(address => mapping(uint64 => bytes32))) feedback;
        // agentId => clients
        mapping(uint256 => EnumerableSetLib.AddressSet) clients;
        // agentId => client => feedback index => responders
        mapping(uint256 => mapping(address => mapping(uint64 => EnumerableSetLib.AddressSet))) responders;
        // agentId => client => feedback index => sender => count of responses
        mapping(uint256 => mapping(address => mapping(uint64 => mapping(address => uint256)))) responseCount;
    }

    // keccak256(abi.encode(uint256(keccak256("apps.facets.reputation.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x501066df74618204890aa19abae8215a74ecf89f414b33f7d3fe6e08c61d9100;

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
