// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Towns} from "../Towns.sol";

contract TownsV2 is Towns {
  function updateCoolDown(uint256 newCoolDown) external onlyOwner {
    _setDefaultCooldown(newCoolDown);
  }
}
