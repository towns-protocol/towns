// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";

import {TownOwnerV1} from "contracts/src/tokens/TownOwnerV1.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";

import {console} from "forge-std/console.sol";

contract UpgradeTownOwner is ScriptUtils {
  SpaceFactory internal spaceFactory;
  TownOwnerV1 internal townOwner;

  function setUp() public {
    address spaceFactoryAddress = _readAddress(".spaceFactory");
    spaceFactory = SpaceFactory(spaceFactoryAddress);
  }

  function run() public {
    uint256 deployerPrivateKey = _getPrivateKey();
    address deployer = vm.addr(deployerPrivateKey);

    vm.startBroadcast(deployerPrivateKey);
    SpaceFactory newSpaceFactory = new SpaceFactory();
    spaceFactory.setPaused(true);
    spaceFactory.upgradeTo(address(newSpaceFactory));
    townOwner = new TownOwnerV1("Town Owner", "TOWN", deployer, 0);
    townOwner.setFactory(address(spaceFactory));
    spaceFactory.setSpaceToken(address(townOwner));
    spaceFactory.setPaused(false);
    vm.stopBroadcast();

    console.log("SpaceFactory: %s", address(spaceFactory));
    console.log("TownOwner: %s", address(townOwner));
  }
}
