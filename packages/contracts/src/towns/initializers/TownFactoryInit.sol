// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {ProxyManagerBase} from "contracts/src/diamond/proxy/manager/ProxyManagerBase.sol";
import {TownArchitectService} from "contracts/src/towns/facets/architect/TownArchitectService.sol";
import {Initializable} from "contracts/src/diamond/facets/initializable/Initializable.sol";

contract TownFactoryInit is ProxyManagerBase, Initializable {
  struct Args {
    address proxyImplementation;
    address townToken;
    address userEntitlementImplementation;
    address tokenEntitlementImplementation;
  }

  function init(Args memory args) external initializer {
    _setImplementation(args.proxyImplementation);
    TownArchitectService.setImplementations(
      args.townToken,
      args.userEntitlementImplementation,
      args.tokenEntitlementImplementation
    );
  }
}
