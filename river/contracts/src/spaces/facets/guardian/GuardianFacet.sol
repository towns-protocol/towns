// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IGuardian} from "./IGuardian.sol";

// libraries

// contracts
import {GuardianBase} from "./GuardianBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract GuardianFacet is IGuardian, GuardianBase, Facet {
  function __GuardianFacet_init(uint256 cooldown) external onlyInitializing {
    _setDefaultCooldown(cooldown);
  }

  function enableGuardian() external onlyEOA {
    _enableGuardian(msg.sender);
  }

  function guardianCooldown(address guardian) external view returns (uint256) {
    return _guardianCooldown(guardian);
  }

  function disableGuardian() external onlyEOA {
    _disableGuardian(msg.sender);
  }

  function isGuardianEnabled(address guardian) external view returns (bool) {
    return _guardianEnabled(guardian);
  }
}
