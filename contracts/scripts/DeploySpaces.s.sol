// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

/* Interfaces */

/* Libraries */
import {console} from "forge-std/console.sol";
import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

/* Contracts */
import {Space} from "contracts/src/core/spaces/Space.sol";
import {SpaceOwner} from "contracts/src/core/tokens/SpaceOwner.sol";
import {SpaceFactory} from "contracts/src/core/spaces/SpaceFactory.sol";
import {Pioneer} from "contracts/src/core/tokens/Pioneer.sol";
import {UserEntitlement} from "contracts/src/core/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/core/spaces/entitlements/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeploySpaces is ScriptUtils {
  SpaceFactory internal spaceFactory;
  Space internal spaceImplementation;
  TokenEntitlement internal tokenImplementation;
  UserEntitlement internal userImplementation;
  SpaceOwner internal spaceToken;
  Pioneer internal pioneer;
  string[] public initialPermissions;

  function run() external {
    _createInitialOwnerPermissions();

    vm.startBroadcast();
    pioneer = new Pioneer("Pioneer", "PNR", "");
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
            address(pioneer),
            initialPermissions
          )
        )
      )
    );

    spaceToken.setFactory(spaceFactoryAddress);
    vm.stopBroadcast();

    spaceFactory = SpaceFactory(spaceFactoryAddress);

    _writeJson();
    _logAddresses();
  }

  function _logAddresses() internal view {
    console.log("--- Deployed Spaces ---");
    console.log("Pioneer Token: ", address(pioneer));
    console.log("Space Token: ", address(spaceToken));
    console.log("Space: ", address(spaceImplementation));
    console.log("Token Entitlement: ", address(tokenImplementation));
    console.log("User Entitlement: ", address(userImplementation));
    console.log("Space Factory: ", address(spaceFactory));
    console.log("------------------------");
  }

  function _writeJson() internal {
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

    vm.writeJson(vm.toString(address(spaceFactory)), path, ".spaceFactory");
    vm.writeJson(vm.toString(address(spaceFactory)), goPath, ".spaceFactory");

    vm.writeJson(vm.toString(address(spaceToken)), path, ".spaceToken");
    vm.writeJson(vm.toString(address(spaceToken)), goPath, ".spaceToken");

    vm.writeJson(vm.toString(address(pioneer)), path, ".pioneerToken");
    vm.writeJson(vm.toString(address(pioneer)), goPath, ".pioneerToken");
  }

  function _createInitialOwnerPermissions() internal {
    initialPermissions.push(Permissions.Read);
    initialPermissions.push(Permissions.Write);
    initialPermissions.push(Permissions.Invite);
    initialPermissions.push(Permissions.Redact);
    initialPermissions.push(Permissions.Ban);
    initialPermissions.push(Permissions.Ping);
    initialPermissions.push(Permissions.PinMessage);
    initialPermissions.push(Permissions.Owner);
    initialPermissions.push(Permissions.AddRemoveChannels);
    initialPermissions.push(Permissions.ModifySpaceSettings);
    initialPermissions.push(Permissions.Upgrade);
  }
}
