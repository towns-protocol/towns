// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {TownProxyStorage} from "./TownProxyStorage.sol";

// contracts

abstract contract TownProxyBase {
  function _setNetworkId(string memory networkId) internal {
    TownProxyStorage.layout().networkId = networkId;
  }

  function _setCreatedAt() internal {
    TownProxyStorage.layout().createdAt = block.timestamp;
  }
}
