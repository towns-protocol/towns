// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries
import {TownProxyStorage} from "./TownProxyStorage.sol";

// contracts

library TownProxyService {
  using TownProxyStorage for TownProxyStorage.Layout;

  function setNetworkId(string memory networkId) internal {
    TownProxyStorage.layout().networkId = networkId;
  }
}
