// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IGuardian} from "./IGuardian.sol";

// libraries

// contracts
import {GuardianBase} from "./GuardianBase.sol";

import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract GuardianFacet is IGuardian, GuardianBase, OwnableBase, Facet {
    function __GuardianFacet_init(uint256 cooldown) external onlyInitializing {
        _setDefaultCooldown(cooldown);
    }

    function enableGuardian() external {
        _enableGuardian(msg.sender);
    }

    function guardianCooldown(address guardian) external view returns (uint256) {
        return _guardianCooldown(guardian);
    }

    function disableGuardian() external {
        _disableGuardian(msg.sender);
    }

    function isGuardianEnabled(address guardian) external view returns (bool) {
        return _guardianEnabled(guardian);
    }

    function getDefaultCooldown() external view returns (uint256) {
        return _getDefaultCooldown();
    }

    function setDefaultCooldown(uint256 cooldown) external onlyOwner {
        _setDefaultCooldown(cooldown);
    }
}
