// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {ProxyManagerStorage} from "./ProxyManagerStorage.sol";
import {Address} from "openzeppelin-contracts/contracts/utils/Address.sol";

error ProxyManagerService__NotContract(address implementation);

library ProxyManagerService {
  function setImplementation(address implementation) internal {
    if (!Address.isContract(implementation)) {
      revert ProxyManagerService__NotContract(implementation);
    }

    ProxyManagerStorage.layout().implementation = implementation;
  }

  function getImplementation() internal view returns (address) {
    return ProxyManagerStorage.layout().implementation;
  }
}
