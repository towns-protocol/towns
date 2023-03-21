// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

/* Interfaces */

/* Libraries */
import {console} from "forge-std/console.sol";
import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

/* Contracts */
import {Space} from "contracts/src/core/spaces/Space.sol";
import {TownOwner} from "contracts/src/core/tokens/TownOwner.sol";
import {Pioneer} from "contracts/src/core/tokens/Pioneer.sol";
import {SpaceFactory} from "contracts/src/core/spaces/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/core/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/core/spaces/entitlements/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DeployPioneer} from "contracts/scripts/DeployPioneer.s.sol";
import {DeployTownOwner} from "contracts/scripts/DeployTownOwner.s.sol";

contract DeploySpaces is ScriptUtils {
  DeployPioneer internal deployPioneer;
  DeployTownOwner internal deploySpaceOwner;

  SpaceFactory internal spaceFactory;
  Space internal spaceImplementation;
  TokenEntitlement internal tokenImplementation;
  UserEntitlement internal userImplementation;
  TownOwner internal spaceToken;
  Pioneer internal pioneer;
  string[] public initialPermissions;

  function run() public {
    deployPioneer = new DeployPioneer();
    deployPioneer.run();
    pioneer = deployPioneer.pioneer();

    deploySpaceOwner = new DeployTownOwner();
    deploySpaceOwner.run();
    spaceToken = deploySpaceOwner.townOwner();

    _createInitialOwnerPermissions();

    vm.startBroadcast();
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

    if (!_isTesting()) {
      _writeJson();
      _logAddresses();
    }
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
    _writeAddress("spaceFactory", address(spaceFactory));
    _writeAddress("spaceToken", address(spaceToken));
    _writeAddress("pioneerToken", address(pioneer));
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
