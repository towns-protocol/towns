// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Script.sol";

import {Space} from "contracts/src/core/spaces/Space.sol";
import {SpaceFactory} from "contracts/src/core/spaces/SpaceFactory.sol";
import {DataTypes} from "contracts/src/libraries/DataTypes.sol";

contract CreateSpace is Script {
  SpaceFactory public spaceFactory;

  function run() public {
    spaceFactory = SpaceFactory(0x173b6a4Ec998A0e72656e0fc9Af2408B017C12f9);

    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _permissions = new string[](0);

    vm.startBroadcast();
    spaceFactory.createSpace(
      "moonbirds",
      "!7evmpuHDDgkady6u:goerli",
      "ipfs://QmZion",
      _permissions,
      _entitlementData
    );
    vm.stopBroadcast();
  }
}
