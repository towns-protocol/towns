// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Script.sol";

import {ZionSpaceManager} from "./../src/spaces/ZionSpaceManager.sol";
import {TokenEntitlementModule} from "./../src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "./../src/spaces/ZionPermissionsRegistry.sol";
import {ZionRoleManager} from "./../src/spaces/ZionRoleManager.sol";
import {ZionSpace} from "./../src/spaces/nft/ZionSpace.sol";

contract DeployZionEntitlements is Script {
  ZionSpaceManager spaceManager;
  ZionRoleManager roleManager;
  ZionPermissionsRegistry permissionsRegistry;
  UserGrantedEntitlementModule userGrantedEntitlementModule;
  TokenEntitlementModule tokenEntitlementModule;
  ZionSpace zionSpaceNFT;

  function run() public {
    spaceManager = ZionSpaceManager(0xb194C2E006aEeC94BC8bAa39B8578992134deF80);
    roleManager = ZionRoleManager(0xf941F1f08E0EA9A747E7Eef53C57dc13425aA8af);
    permissionsRegistry = ZionPermissionsRegistry(
      0x07e71c115aE5F2929E13940148015284242c3f07
    );

    vm.startBroadcast();

    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      "UserGrantedEntitlementModule",
      address(spaceManager),
      address(roleManager),
      address(permissionsRegistry)
    );

    tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      "TokenEntitlementModule",
      address(spaceManager),
      address(roleManager),
      address(permissionsRegistry)
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

    console.log(
      "User Granted Entitlement Address",
      address(userGrantedEntitlementModule)
    );

    console.log("Token Entitlement Address", address(tokenEntitlementModule));

    console.log("Zion Space Address", address(zionSpaceNFT));
  }
}
