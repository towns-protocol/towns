// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Self} from "./Self.sol";

error DelegateCall_NotAllowed();
error DelegateCall_OnlyDelegate();

abstract contract DelegateCall is Self {
  modifier onlyDelegateCall() {
    if (address(this) == _self) revert DelegateCall_OnlyDelegate();
    _;
  }

  modifier noDelegateCall() {
    if (address(this) != _self) revert DelegateCall_NotAllowed();
    _;
  }
}
