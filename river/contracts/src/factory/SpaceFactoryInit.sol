// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceProxyInitializer} from "contracts/src/spaces/facets/proxy/ISpaceProxyInitializer.sol";

// libraries
import {ImplementationStorage} from "contracts/src/factory/facets/architect/ImplementationStorage.sol";

// contracts

contract SpaceFactoryInit {
  function initialize(address proxyInitializer) external {
    ImplementationStorage.Layout storage ds = ImplementationStorage.layout();
    ds.proxyInitializer = ISpaceProxyInitializer(proxyInitializer);
  }
}
