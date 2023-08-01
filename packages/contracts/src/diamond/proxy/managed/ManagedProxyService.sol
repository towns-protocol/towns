// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {ManagedProxyStorage} from "contracts/src/diamond/proxy/managed/ManagedProxyStorage.sol";

// contracts

library ManagedProxyService {
  function manager() internal view returns (address) {
    return ManagedProxyStorage.layout().manager;
  }

  function managerSelector() internal view returns (bytes4) {
    return ManagedProxyStorage.layout().managerSelector;
  }

  function setManager(address newManager) internal {
    ManagedProxyStorage.layout().manager = newManager;
  }

  function setManagerSelector(bytes4 newManagerSelector) internal {
    ManagedProxyStorage.layout().managerSelector = newManagerSelector;
  }
}
