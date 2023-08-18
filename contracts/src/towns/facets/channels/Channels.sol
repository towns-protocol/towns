// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IChannel} from "./IChannel.sol";

// libraries
import {Permissions} from "contracts/src/towns/facets/Permissions.sol";

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {Entitled} from "contracts/src/towns/facets/Entitled.sol";
import {ChannelBase} from "./ChannelBase.sol";

contract Channels is IChannel, ChannelBase, Entitled, Facet {
  function createChannel(
    string memory channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) external {
    _validatePermission(Permissions.ModifyChannels);
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
    _validatePermission(Permissions.ModifyChannels);
    _updateChannel(channelId, metadata, disabled);
  }

  function removeChannel(string memory channelId) external {
    _validatePermission(Permissions.ModifyChannels);
    _removeChannel(channelId);
  }

  function addRoleToChannel(
    string calldata channelId,
    uint256 roleId
  ) external {
    _validateChannelPermission(channelId, Permissions.ModifyChannels);
    _addRoleToChannel(channelId, roleId);
  }

  function removeRoleFromChannel(
    string calldata channelId,
    uint256 roleId
  ) external {
    _validateChannelPermission(channelId, Permissions.ModifyChannels);
    _removeRoleFromChannel(channelId, roleId);
  }
}
