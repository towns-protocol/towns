// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {ZionSpaceManager} from "contracts/src/spaces/ZionSpaceManager.sol";
import {TokenEntitlementModule} from "contracts/src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "contracts/src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "contracts/src/spaces/ZionPermissionsRegistry.sol";
import {ZionRoleManager} from "contracts/src/spaces/ZionRoleManager.sol";
import {ZionSpace} from "contracts/src/spaces/nft/ZionSpace.sol";

abstract contract BaseSetup is Test {
  ZionSpaceManager internal spaceManager;
  ZionRoleManager internal roleManager;
  ZionPermissionsRegistry internal permissionsRegistry;
  UserGrantedEntitlementModule internal userGrantedEntitlementModule;
  TokenEntitlementModule internal tokenEntitlementModule;
  ZionSpace internal zionSpaceNFT;

  function setUp() public virtual {
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
  }
}
