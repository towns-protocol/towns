// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";

import {Space} from "contracts/src/spaces/Space.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";
import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";

import {console} from "forge-std/console.sol";

contract UpgradeImplementation is ScriptUtils {
  SpaceFactory internal spaceFactory;
  TokenEntitlement internal tokenEntitlement;
  UserEntitlement internal userEntitlement;

  function setUp() public {
    address spaceFactoryAddress = _readAddress("spaceFactory");
    spaceFactory = SpaceFactory(spaceFactoryAddress);
  }

  function run() public {
    vm.startBroadcast();
    SpaceFactory newSpaceFactory = new SpaceFactory();
    Space space = new Space();

    spaceFactory.setPaused(true);
    spaceFactory.upgradeTo(address(newSpaceFactory));

    spaceFactory.updateImplementations(
      address(space),
      address(0),
      address(0),
      address(0),
      address(0)
    );

    spaceFactory.setPaused(false);
    vm.stopBroadcast();

    console.log("SpaceFactory: %s", address(spaceFactory));
    console.log("Space: %s", address(space));
  }
}
