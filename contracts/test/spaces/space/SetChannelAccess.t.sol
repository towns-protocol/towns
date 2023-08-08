// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";

contract SetChannelAccessTest is SpaceBaseSetup {
  function setUp() external {}

  function testSetChannelAccess() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    Space(_space).createChannel(channelName, channelId, roleIds);

    Space(_space).setChannelAccess(channelId, true);

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      keccak256(abi.encodePacked(channelId))
    );

    assertTrue(_channel.disabled);
  }

  function testSetChannelAccessNotAllowed() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelId, roleIds);

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setChannelAccess(channelId, true);
  }

  function testSetChannelAccessChannelDoesNotExist() external {
    address _space = createSimpleSpace();

    string memory channelId = "channelId";

    vm.expectRevert(Errors.ChannelDoesNotExist.selector);
    Space(_space).setChannelAccess(channelId, true);
  }
}
