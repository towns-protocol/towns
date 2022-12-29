// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

/* Interfaces */

/* Libraries */
import {console} from "forge-std/console.sol";
import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

/* Contracts */
import {Space} from "contracts/src/spacesv2/Space.sol";
import {SpaceOwner} from "contracts/src/spacesv2/SpaceOwner.sol";
import {SpaceFactory} from "contracts/src/spacesv2/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/spacesv2/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spacesv2/entitlements/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeploySpaces is ScriptUtils {
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
    spaceFactory = new SpaceFactory();

    address spaceFactoryAddress = address(
      new ERC1967Proxy(
        address(spaceFactory),
        abi.encodeCall(
          spaceFactory.initialize,
          (
            address(spaceImplementation),
            address(tokenImplementation),
            address(userImplementation),
            address(spaceToken),
            initialPermissions
          )
        )
      )
    );

    spaceToken.setFactory(spaceFactoryAddress);
    spaceFactory = SpaceFactory(spaceFactoryAddress);

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
    string memory json = "";
    json = vm.serializeString(
      json,
      "spaceFactory",
      vm.toString(address(spaceFactory))
    );
    string memory path = string.concat(
      "packages/contracts/",
      _getChainName(),
      "/addresses/space-factory.json"
    );

    string memory goPath = string.concat(
      "servers/dendrite/zion/contracts/",
      _getChainName(),
      "_space_factory",
      "/space-factory.json"
    );

    vm.writeJson(json, path);
    vm.writeJson(json, goPath);
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
