// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {ITownBase} from "./ITown.sol";

// libraries
import {TownStorage} from "./TownStorage.sol";

// contracts

abstract contract TownBase is ITownBase {
  function __TownBase_init(string memory networkId) internal {
    TownStorage.Layout storage ds = TownStorage.layout();
    ds.networkId = networkId;
    ds.createdAt = block.timestamp;
  }

  function _info() internal view returns (Info memory) {
    TownStorage.Layout storage ds = TownStorage.layout();
    return Info({networkId: ds.networkId, createdAt: ds.createdAt});
  }
}
