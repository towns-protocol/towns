//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Script.sol";

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {console} from "forge-std/console.sol";

import {ZionSpaceManager} from "./../src/spaces/ZionSpaceManager.sol";
import {TokenEntitlementModule} from "./../src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "./../src/spaces/ZionPermissionsRegistry.sol";
import {ZionRoleManager} from "./../src/spaces/ZionRoleManager.sol";
import {ZionSpace} from "./../src/spaces/nft/ZionSpace.sol";

contract DeployLocal is ScriptUtils {
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
      "User Granted",
      "Allows users to grant other users access to spaces and rooms",
      "UserGrantedEntitlementModule",
      address(spaceManager),
      address(roleManager),
      address(permissionsRegistry)
    );

    tokenEntitlementModule = new TokenEntitlementModule(
      "Token",
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

    _writeJson();
    _logAddresses();
  }

  function _logAddresses() internal view {
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

  function _writeJson() internal {
    string memory json = "";
    vm.serializeString(
      json,
      "spacemanager",
      vm.toString(address(spaceManager))
    );
    vm.serializeString(
      json,
      "usergranted",
      vm.toString(address(userGrantedEntitlementModule))
    );
    vm.serializeString(
      json,
      "tokengranted",
      vm.toString(address(tokenEntitlementModule))
    );
    json = vm.serializeString(
      json,
      "rolemanager",
      vm.toString(address(roleManager))
    );

    string memory path = string.concat(
      "packages/contracts/",
      _getChainName(),
      "/addresses/space-manager.json"
    );

    string memory goPath = string.concat(
      "servers/dendrite/zion/contracts/zion_",
      _getChainName(),
      "/space-manager.json"
    );

    vm.writeJson(json, path);
    vm.writeJson(json, goPath);
  }
}
