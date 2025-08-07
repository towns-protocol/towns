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
        _setFeatureCondition(featureId, condition);
        emit FeatureConditionSet(featureId, condition);
    }

    /// @inheritdoc IFeatureManagerFacet
    function getFeatureCondition(
        bytes32 featureId
    ) external view returns (FeatureCondition memory) {
        return _getFeatureCondition(featureId);
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
    function disableFeatureCondition(bytes32 featureId) external onlyOwner {
        _disableFeatureCondition(featureId);
        emit FeatureConditionDisabled(featureId);
    }

    /// @inheritdoc IFeatureManagerFacet
    function checkFeatureCondition(bytes32 featureId, address space) external view returns (bool) {
        FeatureCondition memory condition = _getFeatureCondition(featureId);
        if (!condition.active) return false;
        uint256 votes = IVotes(condition.token).getVotes(space);
        return _meetsThreshold(condition, votes);
    }
}
