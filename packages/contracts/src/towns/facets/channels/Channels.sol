// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IChannel} from "./IChannel.sol";

// libraries

// contracts
import {ChannelController} from "./ChannelController.sol";
import {Initializable} from "contracts/src/diamond/facets/initializable/Initializable.sol";

contract Channels is ChannelController, Initializable, IChannel {
  function createChannel(
    string memory channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) external {
    _createChannel(channelId, metadata, roleIds);
  }

  function getChannel(
    string memory channelId
  ) external view returns (Channel memory channel) {
    return _getChannel(channelId);
  }

  function getChannels() external view returns (Channel[] memory channels) {
    return _getChannels();
  }

  function updateChannel(
    string memory channelId,
    string memory metadata,
    bool disabled
  ) external {
    _updateChannel(channelId, metadata, disabled);
  }

  function removeChannel(string memory channelId) external {
    _removeChannel(channelId);
  }

  function addRoleToChannel(
    string calldata channelId,
    uint256 roleId
  ) external {
    _addRoleToChannel(channelId, roleId);
  }

  function removeRoleFromChannel(
    string calldata channelId,
    uint256 roleId
  ) external {
    _removeRoleFromChannel(channelId, roleId);
  }
}
