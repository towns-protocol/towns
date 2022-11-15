//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Script.sol";

import {ZionSpaceManager} from "./../src/spaces/ZionSpaceManager.sol";
import {TokenEntitlementModule} from "./../src/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../src/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionPermissionsRegistry} from "./../src/spaces/ZionPermissionsRegistry.sol";
import {ZionRoleManager} from "./../src/spaces/ZionRoleManager.sol";
import {ZionSpace} from "./../src/spaces/nft/ZionSpace.sol";

import {Helper} from "./Helper.sol";
import "solidity-json-writer/JsonWriter.sol";

contract DeployLocal is Script {
  using JsonWriter for JsonWriter.Json;
  JsonWriter.Json writer;

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

    writer = writer.writeStartObject();
    writer = writer.writeStringProperty(
      "spacemanager",
      Helper.toString(abi.encodePacked(address(spaceManager)))
    );
    writer = writer.writeStringProperty(
      "usergranted",
      Helper.toString(abi.encodePacked(address(userGrantedEntitlementModule)))
    );
    writer = writer.writeStringProperty(
      "tokengranted",
      Helper.toString(abi.encodePacked(address(tokenEntitlementModule)))
    );
    writer = writer.writeStringProperty(
      "rolemanager",
      Helper.toString(abi.encodePacked(address(roleManager)))
    );
    writer = writer.writeEndObject();

    string memory path = string.concat(
      "packages/contracts/",
      Helper.getChainName(),
      "/addresses/space-manager.json"
    );

    string memory goPath = string.concat(
      "servers/dendrite/zion/contracts/zion_",
      Helper.getChainName(),
      "/space-manager.json"
    );

    vm.writeFile(path, writer.value);
    vm.writeFile(goPath, writer.value);
  }
}
