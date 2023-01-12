// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract SetChannelAccessTest is BaseSetup {
  function setUp() external {
    BaseSetup.init();
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
