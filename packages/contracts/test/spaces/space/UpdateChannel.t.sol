// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/libraries/DataTypes.sol";
import {Errors} from "contracts/src/libraries/Errors.sol";
import {Permissions} from "contracts/src/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/core/spaces/Space.sol";

contract UpdateChannelTest is SpaceBaseSetup {
  function setUp() public {}

  function testUpdateChannel() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    Space(_space).createChannel(channelName, channelId, roleIds);

    string memory newChannelName = "new-channel-name";

    Space(_space).updateChannel(channelId, newChannelName);

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      keccak256(abi.encodePacked(channelId))
    );

    assertEq(_channel.name, newChannelName);
  }

  function testUpdateChannelNotAllowed(string memory channelId) external {
    string memory channelName = "channl-2";

    address _space = createSimpleSpace();

    (, , uint256[] memory roleIds) = _createSimpleChannelData();

    Space(_space).createChannel("channel-1", channelId, roleIds);

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).updateChannel(channelId, channelName);
  }

  function testUpdateChannelDoesNotExist(string memory channelName) external {
    address _space = createSimpleSpace();
    string memory newChannelName = "new-channel-name";
    vm.expectRevert(Errors.ChannelDoesNotExist.selector);
    Space(_space).updateChannel(channelName, newChannelName);
  }

  function testUpdateChannelEmptyString(string memory channelId) external {
    address _space = createSimpleSpace();
    (, , uint256[] memory roleIds) = _createSimpleChannelData();

    Space(_space).createChannel("channel-1", channelId, roleIds);

    vm.expectRevert(Errors.NameLengthInvalid.selector);
    Space(_space).updateChannel(channelId, "");
  }
}
