// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/libraries/DataTypes.sol";
import {Errors} from "contracts/src/libraries/Errors.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/core/spaces/Space.sol";

contract SetChannelAccessTest is SpaceBaseSetup {
  function setUp() external {
    SpaceBaseSetup.init();
  }

  function testSetChannelAccess() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    Space(_space).setChannelAccess(channelNetworkId, true);

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      keccak256(abi.encodePacked(channelNetworkId))
    );

    assertTrue(_channel.disabled);
  }

  function testSetChannelAccessNotAllowed() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setChannelAccess(channelNetworkId, true);
  }

  function testSetChannelAccessChannelDoesNotExist(
    string memory channelId
  ) external {
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.ChannelDoesNotExist.selector);
    Space(_space).setChannelAccess(channelId, true);
  }
}
