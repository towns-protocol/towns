//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Script.sol";

import {TokenEntitlementModule} from "./../../contracts/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../../contracts/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {DataTypes} from "./../../contracts/spaces/libraries/DataTypes.sol";

contract DeployZionSpaceManager is Script {
  function run() external {
    vm.startBroadcast();

    ZionSpaceManager zionSpaceManager = new ZionSpaceManager();
    console.log("Deploying ZionSpaceManager a: ", address(zionSpaceManager));

    UserGrantedEntitlementModule userGrantedEntitlementModule = new UserGrantedEntitlementModule(
        "User Granted Entitlement Module",
        "Allows users to grant other users access to spaces and rooms",
        address(zionSpaceManager)
      );

    console.log(
      "User Granted Entitlement Address",
      address(userGrantedEntitlementModule)
    );

    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(zionSpaceManager)
    );
    console.log("Token Entitlement Address", address(tokenEntitlementModule));

    zionSpaceManager.registerDefaultEntitlementModule(
      address(userGrantedEntitlementModule)
    );

    vm.stopBroadcast();
  }
}
