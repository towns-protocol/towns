// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Script.sol";

import {Space} from "contracts/src/core/spaces/Space.sol";
import {SpaceFactory} from "contracts/src/core/spaces/SpaceFactory.sol";
import {TokenEntitlement} from "contracts/src/core/spaces/entitlements/TokenEntitlement.sol";
import {DataTypes} from "contracts/src/libraries/DataTypes.sol";

import {console} from "forge-std/console.sol";

contract UpgradeImplementation is Script {
  SpaceFactory internal spaceFactory;
  TokenEntitlement internal tokenEntitlement;

  function run() public {
    spaceFactory = SpaceFactory(0x173b6a4Ec998A0e72656e0fc9Af2408B017C12f9);

    vm.startBroadcast();
    tokenEntitlement = new TokenEntitlement();

    spaceFactory.updateImplementations(
      address(0),
      address(tokenEntitlement),
      address(0)
    );
    vm.stopBroadcast();

    console.log("SpaceFactory: %s", address(spaceFactory));
    console.log("TokenEntitlement: %s", address(tokenEntitlement));
  }
}
