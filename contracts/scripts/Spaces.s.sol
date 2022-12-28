// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

// interfaces
// libraries
import {Helper} from "./Helper.sol";
import {JsonWriter} from "solidity-json-writer/JsonWriter.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

// contracts
import "forge-std/Script.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";
import {SpaceOwner} from "contracts/src/spacesv2/SpaceOwner.sol";
import {SpaceFactory} from "contracts/src/spacesv2/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/spacesv2/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spacesv2/entitlements/TokenEntitlement.sol";

contract DeploySpaces is Script {
  using JsonWriter for JsonWriter.Json;

  JsonWriter.Json writer;
  SpaceFactory internal spaceFactory;
  Space internal spaceImplementation;
  TokenEntitlement internal tokenImplementation;
  UserEntitlement internal userImplementation;
  SpaceOwner internal spaceToken;
  string[] public initialPermissions;

  function run() external {
    _createInitialOwnerPermissions();

    vm.startBroadcast();
    spaceToken = new SpaceOwner("Space Owner", "SPACE");
    spaceImplementation = new Space();
    tokenImplementation = new TokenEntitlement();
    userImplementation = new UserEntitlement();

    spaceFactory = new SpaceFactory(
      address(spaceImplementation),
      address(tokenImplementation),
      address(userImplementation),
      address(spaceToken),
      initialPermissions
    );

    spaceToken.setFactory(address(spaceFactory));
    vm.stopBroadcast();

    _writeJson();
    _logAddresses();
  }

  function _logAddresses() internal view {
    console.log("--- Deployed Spaces ---");
    console.log("Space Token: ", address(spaceToken));
    console.log("Space: ", address(spaceImplementation));
    console.log("Token Entitlement: ", address(tokenImplementation));
    console.log("User Entitlement: ", address(userImplementation));
    console.log("Space Factory: ", address(spaceFactory));
    console.log("------------------------");
  }

  function _writeJson() internal {
    writer = writer.writeStartObject();
    writer = writer.writeStringProperty(
      "spaceFactory",
      Helper.toString(abi.encodePacked(address(spaceFactory)))
    );
    writer = writer.writeEndObject();
    string memory path = string.concat(
      "packages/contracts/",
      Helper.getChainName(),
      "/addresses/spaceFactory.json"
    );
    vm.writeFile(path, writer.value);
  }

  function _createInitialOwnerPermissions() internal {
    initialPermissions.push(Permissions.Read);
    initialPermissions.push(Permissions.Write);
    initialPermissions.push(Permissions.Invite);
    initialPermissions.push(Permissions.Redact);
    initialPermissions.push(Permissions.Ban);
    initialPermissions.push(Permissions.Ping);
    initialPermissions.push(Permissions.PinMessage);
    initialPermissions.push(Permissions.ModifyChannelPermissions);
    initialPermissions.push(Permissions.ModifyProfile);
    initialPermissions.push(Permissions.Owner);
    initialPermissions.push(Permissions.AddRemoveChannels);
    initialPermissions.push(Permissions.ModifySpacePermissions);
    initialPermissions.push(Permissions.ModifyChannelDefaults);
  }
}
