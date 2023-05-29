// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Script.sol";

import {Space} from "contracts/src/spaces/Space.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";

contract CreateSpace is Script {
  SpaceFactory public spaceFactory;

  function run() public {
    spaceFactory = SpaceFactory(0x59E16E32040Af97E56244562b569a244D3e59342);

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
      DataTypes.CreateSpaceData(
        "moonbirds",
        "!7evmpuHDDgkady6u:goerli",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      _permissions,
      _entitlementData
    );
    vm.stopBroadcast();
  }
}
