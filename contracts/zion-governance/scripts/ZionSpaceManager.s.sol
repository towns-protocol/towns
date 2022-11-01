//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Script.sol";

import {ZionSpaceManager} from "./../src/spaces/ZionSpaceManager.sol";
import {TokenEntitlementModule} from "./../src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "./../src/spaces/ZionPermissionsRegistry.sol";
import {ZionRoleManager} from "./../src/spaces/ZionRoleManager.sol";
import {ZionSpace} from "./../src/spaces/nft/ZionSpace.sol";

contract DeployZionSpaceManager is Script {
  ZionSpaceManager internal spaceManager;
  ZionRoleManager internal roleManager;
  ZionPermissionsRegistry internal permissionsRegistry;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;
  TokenEntitlementModule internal tokenEntitlementModule;
  ZionSpace internal zionSpaceNFT;

  function run() external {
    vm.startBroadcast();

    permissionsRegistry = new ZionPermissionsRegistry();
    roleManager = new ZionRoleManager(address(permissionsRegistry));

    spaceManager = new ZionSpaceManager(
      address(permissionsRegistry),
      address(roleManager)
    );

    roleManager.setSpaceManager(address(spaceManager));

    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      address(spaceManager),
      address(roleManager)
    );

    tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(spaceManager),
      address(roleManager)
    );

    zionSpaceNFT = new ZionSpace("Zion Space", "ZSNFT", address(spaceManager));

    spaceManager.setDefaultUserEntitlementModule(
      address(userGrantedEntitlementModule)
    );
    spaceManager.setDefaultTokenEntitlementModule(
      address(tokenEntitlementModule)
    );
    spaceManager.setSpaceNFT(address(zionSpaceNFT));

    vm.stopBroadcast();

    console.log("Deployed ZionSpaceManager: ", address(spaceManager));
    console.log(
      "Deployed ZionPermissionsRegistry: ",
      address(permissionsRegistry)
    );
    console.log("Deployed ZionRoleManager: ", address(roleManager));

    console.log(
      "User Granted Entitlement Address",
      address(userGrantedEntitlementModule)
    );

    console.log("Token Entitlement Address", address(tokenEntitlementModule));

    console.log("Zion Space Address", address(zionSpaceNFT));
  }
}
