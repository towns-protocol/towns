// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract SpaceTestSetChannelAccess is BaseSetup {
  function setUp() external {
    BaseSetup.init();
  }

  function testSetChannelAccess() external {
    address _space = createSimpleSpace();

    DataTypes.CreateChannelData
      memory _channelData = _createSimpleChannelData();
    Space(_space).createChannel(_channelData);

    Space(_space).setChannelAccess(_channelData.channelNetworkId, true);

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      keccak256(abi.encodePacked(_channelData.channelNetworkId))
    );

    assertTrue(_channel.disabled);
  }

  function testSetChannelAccessNotAllowed() external {
    address _space = createSimpleSpace();

    DataTypes.CreateChannelData
      memory _channelData = _createSimpleChannelData();
    Space(_space).createChannel(_channelData);

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).setChannelAccess(_channelData.channelNetworkId, true);
  }

  function testSetChannelAccessChannelDoesNotExist() external {
    address _space = createSimpleSpace();

    vm.expectRevert(Errors.ChannelDoesNotExist.selector);
    Space(_space).setChannelAccess("non-existent-channel", true);
  }
}
