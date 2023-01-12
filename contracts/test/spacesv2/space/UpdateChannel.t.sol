// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spacesv2/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spacesv2/libraries/Errors.sol";
import {Permissions} from "contracts/src/spacesv2/libraries/Permissions.sol";

import {BaseSetup} from "contracts/test/spacesv2/BaseSetup.sol";
import {Space} from "contracts/src/spacesv2/Space.sol";

contract UpdateChannelTest is BaseSetup {
  function setUp() public {
    BaseSetup.init();
  }

  function testUpdateChannel() external {
    address _space = createSimpleSpace();

    (
      string memory channelName,
      string memory channelNetworkId,
      uint256[] memory roleIds
    ) = _createSimpleChannelData();
    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    string memory newChannelName = "NewChannelName";

    Space(_space).updateChannel(channelNetworkId, newChannelName);

    DataTypes.Channel memory _channel = Space(_space).getChannelByHash(
      keccak256(abi.encodePacked(channelNetworkId))
    );

    assertEq(_channel.name, newChannelName);
  }

  function testUpdateChannelNotAllowed(
    string memory channelName,
    string memory channelNetworkId,
    string memory newChannelName
  ) external {
    address _space = createSimpleSpace();

    (, , uint256[] memory roleIds) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.prank(_randomAddress());
    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).updateChannel(channelNetworkId, newChannelName);
  }

  function testUpdateChannelDoesNotExist(string memory channelName) external {
    address _space = createSimpleSpace();
    string memory newChannelName = "NewChannelName";
    vm.expectRevert(Errors.ChannelDoesNotExist.selector);
    Space(_space).updateChannel(channelName, newChannelName);
  }

  function testUpdateChannelEmptyString(
    string memory channelName,
    string memory channelNetworkId
  ) external {
    address _space = createSimpleSpace();
    (, , uint256[] memory roleIds) = _createSimpleChannelData();

    Space(_space).createChannel(channelName, channelNetworkId, roleIds);

    vm.expectRevert(Errors.NotAllowed.selector);
    Space(_space).updateChannel(channelNetworkId, "");
  }
}
