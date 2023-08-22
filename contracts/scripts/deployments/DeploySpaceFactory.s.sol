// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

/* Interfaces */

/* Libraries */
import {Deployer} from "../common/Deployer.s.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

/* Contracts */
import {Space} from "contracts/src/spaces/Space.sol";
import {TownOwnerV1} from "contracts/src/tokens/TownOwnerV1.sol";
import {Pioneer} from "contracts/src/tokens/Pioneer.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DeployPioneer} from "contracts/scripts/deployments/DeployPioneer.s.sol";
import {DeployOldTownOwner} from "contracts/scripts/deployments/DeployOldTownOwner.s.sol";
import {DeployTokenImpl, DeployUserImpl} from "contracts/scripts/deployments/DeployImplementations.s.sol";
import {DeploySpaceImpl} from "contracts/scripts/deployments/DeploySpaceImpl.s.sol";

contract DeploySpaceFactory is Deployer {
  DeployPioneer internal deployPioneer;
  DeployOldTownOwner internal deployTownOwner;
  DeploySpaceImpl internal deploySpaceImpl;
  DeployTokenImpl internal deployTokenImpl;
  DeployUserImpl internal deployUserImpl;

  SpaceFactory internal spaceFactory;
  Space internal spaceImplementation;
  TokenEntitlement internal tokenImplementation;
  UserEntitlement internal userImplementation;
  TownOwnerV1 internal spaceToken;
  Pioneer internal pioneer;

  string[] public initialPermissions;

  function versionName() public pure override returns (string memory) {
    return "spaceFactory";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    deployPioneer = new DeployPioneer();
    pioneer = Pioneer(payable(deployPioneer.deploy()));

    deployTownOwner = new DeployOldTownOwner();
    spaceToken = TownOwnerV1(deployTownOwner.deploy());

    deploySpaceImpl = new DeploySpaceImpl();
    spaceImplementation = Space(deploySpaceImpl.deploy());

    deployTokenImpl = new DeployTokenImpl();
    tokenImplementation = TokenEntitlement(deployTokenImpl.deploy());

    deployUserImpl = new DeployUserImpl();
    userImplementation = UserEntitlement(deployUserImpl.deploy());

    _createInitialOwnerPermissions();

    vm.startBroadcast(deployerPK);
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

    // set space upgrades

    return spaceFactoryAddress;
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
