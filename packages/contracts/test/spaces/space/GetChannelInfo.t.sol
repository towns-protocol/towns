// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {ISpace} from "contracts/src/spaces/interfaces/ISpace.sol";

import {console} from "forge-std/console.sol";

contract GetChannelInfoTest is SpaceBaseSetup {
  function test_getChannelInfo() external {
    address space = createSimpleSpace();

    Space(space).createChannel("random", "random-id", new uint256[](0));

    ISpace.ChannelInfo memory channelInfo = Space(space).getChannelInfo(
      "random-id"
    );

    assertEq(channelInfo.channelHash, keccak256(abi.encodePacked("random-id")));
    assertEq(channelInfo.channelId, "random-id");
    assertEq(channelInfo.name, "random");
    assertEq(channelInfo.disabled, false);
  }
}
