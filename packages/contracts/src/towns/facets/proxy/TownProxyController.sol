// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries
import {TownProxyService} from "./TownProxyService.sol";

// contracts

abstract contract TownProxyController {
  function __TownProxy_init(string memory networkId) internal {
    TownProxyService.setNetworkId(networkId);
  }
}
