// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureCondition} from "./IFeatureManagerFacet.sol";

// contracts
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

/// @title FeatureManager
library FeatureManagerStorage {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    // keccak256(abi.encode(uint256(keccak256("factory.facets.feature.manager.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant DEFAULT_STORAGE_SLOT =
        0x20c456a8ea15fcf7965033c954321ffd9dc82a2c65f686a77e2a67da65c29000;

    /// @notice Storage layout for the FeatureManager
    /// @dev Maps feature IDs to their activation conditions
    /// @custom:storage-location erc7201:towns.storage.FeatureManager
    struct Layout {
        // Feature IDs
        EnumerableSetLib.Bytes32Set featureIds;
        // Feature ID => Condition
        mapping(bytes32 featureId => FeatureCondition condition) conditions;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := DEFAULT_STORAGE_SLOT
        }
    }
}
