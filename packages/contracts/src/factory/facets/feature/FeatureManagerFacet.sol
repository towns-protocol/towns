// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureManagerFacet} from "./IFeatureManagerFacet.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

// libraries
import {FeatureManagerBase} from "./FeatureManagerBase.sol";
import {FeatureCondition} from "./IFeatureManagerFacet.sol";

// contracts
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

/// @title FeatureManagerFacet
/// @notice Manages feature conditions and checks for spaces
/// @dev This facet is responsible for managing feature conditions and checking if a space meets the condition for a feature to be enabled
contract FeatureManagerFacet is IFeatureManagerFacet, OwnableBase, Facet, FeatureManagerBase {
    function __FeatureManagerFacet_init() external onlyInitializing {
        _addInterface(type(IFeatureManagerFacet).interfaceId);
    }

    /// @inheritdoc IFeatureManagerFacet
    function setFeatureCondition(
        bytes32 featureId,
        FeatureCondition calldata condition
    ) external onlyOwner {
        _upsertFeatureCondition(featureId, condition, true);
        emit FeatureConditionSet(featureId, condition);
    }

    /// @inheritdoc IFeatureManagerFacet
    function updateFeatureCondition(
        bytes32 featureId,
        FeatureCondition calldata condition
    ) external onlyOwner {
        _upsertFeatureCondition(featureId, condition, false);
        emit FeatureConditionSet(featureId, condition);
    }

    /// @inheritdoc IFeatureManagerFacet
    function disableFeatureCondition(bytes32 featureId) external onlyOwner {
        _disableFeatureCondition(featureId);
        emit FeatureConditionDisabled(featureId);
    }

    /// @inheritdoc IFeatureManagerFacet
    function getFeatureCondition(
        bytes32 featureId
    ) external view returns (FeatureCondition memory result) {
        // Gas optimization: Reclaim implicit memory allocation for return variable
        // since we're loading from storage, not using the pre-allocated memory
        assembly ("memory-safe") {
            mstore(0x40, result)
        }
        result = _getFeatureCondition(featureId);
    }

    /// @inheritdoc IFeatureManagerFacet
    function getFeatureConditions() external view returns (FeatureCondition[] memory) {
        return _getFeatureConditions();
    }

    /// @inheritdoc IFeatureManagerFacet
    function getFeatureConditionsForSpace(
        address space
    ) external view returns (FeatureCondition[] memory) {
        return _getFeatureConditionsForSpace(space);
    }

    /// @inheritdoc IFeatureManagerFacet
    function checkFeatureCondition(bytes32 featureId, address space) external view returns (bool) {
        return _isValidCondition(_getFeatureCondition(featureId), space);
    }
}
