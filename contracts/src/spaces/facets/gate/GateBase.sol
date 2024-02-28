// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries
import {GateService} from "./GateService.sol";

// contracts

abstract contract GateBase {
  function _gateByToken(address token, uint256 quantity) internal {
    GateService.createGate(token, quantity);
  }

  function _ungateByToken(address token) internal {
    GateService.removeGate(token);
  }

  function _isTokenGated(address token) internal view returns (bool) {
    return GateService.isTokenGated(token);
  }

  function _checkTokenGate(address user) internal view {
    GateService.checkTokenGate(user);
  }
}
