// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITown} from "./ITown.sol";

// libraries

// contracts
import {TownBase} from "./TownBase.sol";

contract TownFacet is ITown, TownBase {
  function info() external view override returns (Info memory) {
    return _info();
  }
}
