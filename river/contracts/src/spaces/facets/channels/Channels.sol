// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IChannel} from "./IChannel.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";
import {ChannelBase} from "./ChannelBase.sol";

contract Channels is IChannel, ChannelBase, Entitled, Facet {
  function createChannel(
    bytes32 channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) external {
    _validatePermission(Permissions.ModifyChannels);
    _createChannel(channelId, metadata, roleIds);
  }

  function getChannel(
    bytes32 channelId
  ) external view returns (Channel memory channel) {
    return _getChannel(channelId);
  }

  function getChannels() external view returns (Channel[] memory channels) {
    return _getChannels();
  }

  function updateChannel(
    bytes32 channelId,
    string memory metadata,
    bool disabled
  ) external {
    _validatePermission(Permissions.ModifyChannels);
    _updateChannel(channelId, metadata, disabled);
  }

  function removeChannel(bytes32 channelId) external {
    _validatePermission(Permissions.ModifyChannels);
    _removeChannel(channelId);
  }

  function addRoleToChannel(bytes32 channelId, uint256 roleId) external {
    _validateChannelPermission(channelId, Permissions.ModifyChannels);
    _addRoleToChannel(channelId, roleId);
  }

  function getRolesByChannel(
    bytes32 channelId
  ) external view returns (uint256[] memory roleIds) {
    return _getRolesByChannel(channelId);
  }

  function removeRoleFromChannel(bytes32 channelId, uint256 roleId) external {
    _validateChannelPermission(channelId, Permissions.ModifyChannels);
    _removeRoleFromChannel(channelId, roleId);
  }
}
