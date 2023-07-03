// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
import {ProxyManagerService} from "contracts/src/diamond/proxy/manager/ProxyManagerService.sol";
import {TownArchitectService} from "contracts/src/towns/facets/architect/TownArchitectService.sol";
import {Initializable} from "contracts/src/diamond/extensions/initializable/Initializable.sol";

contract TownFactoryInit is Initializable {
  struct Args {
    address proxyImplementation;
    address townToken;
    address userEntitlementImplementation;
    address tokenEntitlementImplementation;
  }

  function init(Args memory args) external initializer {
    ProxyManagerService.setImplementation(args.proxyImplementation);
    TownArchitectService.setImplementations(
      args.townToken,
      args.userEntitlementImplementation,
      args.tokenEntitlementImplementation
    );
  }
}
