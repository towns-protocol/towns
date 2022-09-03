//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Script.sol";

import {TokenEntitlementModule} from "./../../contracts/spaces/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../../contracts/spaces/entitlements/UserGrantedEntitlementModule.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {DataTypes} from "./../../contracts/spaces/libraries/DataTypes.sol";

contract DeployZionSpaceManager is Script {
  function run() external {
    vm.startBroadcast();

    ZionSpaceManager zionSpaceManager = new ZionSpaceManager();
    console.log("Deploying ZionSpaceManager a: ", address(zionSpaceManager));

    UserGrantedEntitlementModule grantedEntitlementModule = new UserGrantedEntitlementModule(
        address(zionSpaceManager)
      );
    console.log(
      "User Granted Entitlement Address",
      address(grantedEntitlementModule)
    );

    TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
      address(zionSpaceManager)
    );
    console.log("Token Entitlement Address", address(tokenEntitlementModule));

    // Add token entitlement to space contract
    // zionSpaceManager.addEntitlementModule(
    //   DataTypes.AddEntitlementData(1, address(tokenEntitlementModule), "token")
    // );

    vm.stopBroadcast();
  }
}
