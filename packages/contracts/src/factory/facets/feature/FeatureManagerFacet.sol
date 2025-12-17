// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureManager} from "./IFeatureManager.sol";

// libraries
import "./FeatureManagerMod.sol" as FeatureManagerMod;

// contracts
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title FeatureManagerFacet
/// @notice Manages feature conditions and checks for spaces
/// @dev This facet is responsible for managing feature conditions and checking if a space meets the condition for a feature to be enabled
contract FeatureManagerFacet is IFeatureManager, OwnableBase, Facet {
    function __FeatureManagerFacet_init() external onlyInitializing {
        _addInterface(type(IFeatureManager).interfaceId);
    }

    /// @inheritdoc IFeatureManager
    function setFeatureCondition(
        bytes32 featureId,
        FeatureManagerMod.FeatureCondition calldata condition
    ) external onlyOwner {
        FeatureManagerMod.upsertFeatureCondition(featureId, condition, true);
    }

    /// @inheritdoc IFeatureManager
    function updateFeatureCondition(
        bytes32 featureId,
        FeatureManagerMod.FeatureCondition calldata condition
    ) external onlyOwner {
        FeatureManagerMod.upsertFeatureCondition(featureId, condition, false);
    }

    /// @inheritdoc IFeatureManager
    function disableFeatureCondition(bytes32 featureId) external onlyOwner {
        FeatureManagerMod.disableFeatureCondition(featureId);
    }

    /// @inheritdoc IFeatureManager
    function getFeatureCondition(
        bytes32 featureId
    ) external view returns (FeatureManagerMod.FeatureCondition memory result) {
        // Gas optimization: Reclaim implicit memory allocation for return variable
        // since we're loading from storage, not using the pre-allocated memory
        assembly ("memory-safe") {
            mstore(0x40, result)
        }
        result = FeatureManagerMod.getFeatureCondition(featureId);
    }

    /// @inheritdoc IFeatureManager
    function getFeatureConditions()
        external
        view
        returns (FeatureManagerMod.FeatureCondition[] memory)
    {
        return FeatureManagerMod.getFeatureConditions();
    }

    /// @inheritdoc IFeatureManager
    function getFeatureConditionsForSpace(
        address space
    ) external view returns (FeatureManagerMod.FeatureCondition[] memory) {
        return FeatureManagerMod.getFeatureConditionsForAddress(space);
    }

    /// @inheritdoc IFeatureManager
    function checkFeatureCondition(bytes32 featureId, address addr) external view returns (bool) {
        return
            FeatureManagerMod.isValidCondition(
                FeatureManagerMod.getFeatureCondition(featureId),
                addr
            );
    }
}
