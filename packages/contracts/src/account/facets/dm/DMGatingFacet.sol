// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDMGating} from "./IDMGating.sol";

// libraries
import {DMGatingMod} from "./DMGatingMod.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

contract DMGatingFacet is IDMGating, ReentrancyGuardTransient, Facet {
    using DMGatingMod for DMGatingMod.Layout;

    function __DMGatingFacet_init() external onlyInitializing {
        _addInterface(type(IDMGating).interfaceId);
    }

    /// @inheritdoc IDMGating
    function installCriteria(address criteria, bytes calldata data) external nonReentrant {
        DMGatingMod.getStorage().installCriteria(msg.sender, criteria, data);
    }

    /// @inheritdoc IDMGating
    function uninstallCriteria(address criteria) external nonReentrant {
        DMGatingMod.getStorage().uninstallCriteria(msg.sender, criteria);
    }

    /// @inheritdoc IDMGating
    function setCombinationMode(DMGatingMod.CombinationMode mode) external nonReentrant {
        DMGatingMod.getStorage().setCombinationMode(msg.sender, mode);
    }

    /// @inheritdoc IDMGating
    function canReceiveDMFrom(
        address sender,
        bytes calldata extraData
    ) external view returns (bool) {
        return DMGatingMod.getStorage().canReceiveDMFrom(msg.sender, sender, extraData);
    }

    /// @inheritdoc IDMGating
    function getInstalledCriteria() external view returns (address[] memory) {
        return DMGatingMod.getStorage().getInstalledCriteria(msg.sender);
    }

    /// @inheritdoc IDMGating
    function isCriteriaInstalled(address criteria) external view returns (bool) {
        return DMGatingMod.getStorage().isCriteriaInstalled(msg.sender, criteria);
    }

    /// @inheritdoc IDMGating
    function getCombinationMode() external view returns (DMGatingMod.CombinationMode) {
        return DMGatingMod.getStorage().getCombinationMode(msg.sender);
    }
}
