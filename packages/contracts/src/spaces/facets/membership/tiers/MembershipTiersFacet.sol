// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipTiers} from "./IMembershipTiers.sol";

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";

// contracts
import {MembershipTiersBase} from "./MembershipTiersBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";
import {Entitled} from "src/spaces/facets/Entitled.sol";

contract MembershipTiersFacet is
    IMembershipTiers,
    MembershipTiersBase,
    Entitled,
    ReentrancyGuardTransient,
    Facet
{
    function __MembershipTiersFacet_init() external onlyInitializing {
        _addInterface(type(IMembershipTiers).interfaceId);
    }

    function createTier(CreateTier calldata request) external nonReentrant returns (uint16 tierId) {
        _validatePermission(Permissions.ModifyTier);
        tierId = _createTier(request);
        emit TierCreated(tierId);
    }

    function updateTier(uint16 tierId, CreateTier calldata request) external nonReentrant {
        _validatePermission(Permissions.ModifyTier);
        _updateTier(tierId, request);
        emit TierUpdated(tierId);
    }

    function updateTierStatus(uint16 tierId, bool disabled) external nonReentrant {
        _validatePermission(Permissions.ModifyTier);
        _setTierStatus(tierId, disabled);
        emit TierStatusUpdated(tierId, disabled);
    }

    function getTier(uint16 tierId) external view returns (Tier memory) {
        return _getTier(tierId);
    }

    function getTierOfTokenId(uint256 tokenId) external view returns (uint16) {
        return _getTierOfTokenId(tokenId);
    }

    function nextTierId() external view returns (uint16) {
        return _nextTierId();
    }
}
