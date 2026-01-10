// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

struct ValidationStatus {
    address validatorAddress;
    uint256 agentId;
    uint8 response; // 0..100
    bytes32 responseHash;
    bytes32 tag;
    uint256 lastUpdate;
}

library ValidationRegistryStorage {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    struct Layout {
        mapping(bytes32 requestHash => ValidationStatus) validations;
        mapping(uint256 agentId => EnumerableSetLib.Bytes32Set requestHashes) requestByAgent;
        mapping(address validatorAddress => EnumerableSetLib.Bytes32Set requestHashes) requestByValidator;
    }

    // keccak256(abi.encode(uint256(keccak256("apps.facets.validation.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x81b3fc8d09a49d21221f3e1495c2f4652ebf044e3338065682b43c2012468400;

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
