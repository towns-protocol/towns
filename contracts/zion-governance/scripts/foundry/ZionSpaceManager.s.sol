//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Script.sol";

import {TokenEntitlementModule} from "./../../contracts/spaces/modules/entitlements/TokenEntitlementModule.sol";
import {UserGrantedEntitlementModule} from "./../../contracts/spaces/modules/entitlements/UserGrantedEntitlementModule.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {DataTypes} from "./../../contracts/spaces/libraries/DataTypes.sol";
import {Helper} from "./Helper.sol";
import "solidity-json-writer/contracts/JsonWriter.sol";

contract DeployZionSpaceManager is Script {
  using JsonWriter for JsonWriter.Json;
  JsonWriter.Json writer;

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

    writer = writer.writeStartObject();
    writer = writer.writeStringProperty(
      "spacemanager",
      Helper.toString(abi.encodePacked(address(zionSpaceManager)))
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
      "packages/contracts/addresses/",
      vm.toString(Helper.getChainId()),
      "/space-manager.json"
    );

    vm.writeFile(path, writer.value);

    vm.stopBroadcast();
  }
}
