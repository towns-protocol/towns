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
import "solidity-json-writer/contracts/JsonWriter.sol";

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

    console.log("Deploying ZionSpaceManager a: ", address(spaceManager));

    roleManager.setSpaceManager(address(spaceManager));

    userGrantedEntitlementModule = new UserGrantedEntitlementModule(
      "User Granted Entitlement Module",
      "Allows users to grant other users access to spaces and rooms",
      address(spaceManager),
      address(roleManager)
    );

    console.log(
      "User Granted Entitlement Address",
      address(userGrantedEntitlementModule)
    );

    tokenEntitlementModule = new TokenEntitlementModule(
      "Token Entitlement Module",
      "Allows users to grant other users access to spaces and rooms based on tokens they hold",
      address(spaceManager),
      address(roleManager)
    );
    console.log("Token Entitlement Address", address(tokenEntitlementModule));

    zionSpaceNFT = new ZionSpace("Zion Space", "ZSNFT", address(spaceManager));

    console.log("Zion Space Address", address(zionSpaceNFT));

    spaceManager.setDefaultUserEntitlementModule(
      address(userGrantedEntitlementModule)
    );
    spaceManager.setDefaultTokenEntitlementModule(
      address(tokenEntitlementModule)
    );
    spaceManager.setSpaceNFT(address(zionSpaceNFT));

    vm.stopBroadcast();

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
    writer = writer.writeEndObject();

    string memory path = string.concat(
      "packages/contracts/",
      Helper.getChainName(),
      "/addresses/space-manager.json"
    );

    vm.writeFile(path, writer.value);
  }
}
