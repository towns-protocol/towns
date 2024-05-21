// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IChannelBase {
  // =============================================================
  //                           Structs
  // =============================================================
  struct Channel {
    bytes32 id;
    bool disabled;
    string metadata;
    uint256[] roleIds;
  }

  // =============================================================
  //                           Events
  // =============================================================
  event ChannelCreated(address indexed caller, bytes32 channelId);
  event ChannelUpdated(address indexed caller, bytes32 channelId);
  event ChannelRemoved(address indexed caller, bytes32 channelId);
  event ChannelRoleAdded(
    address indexed caller,
    bytes32 channelId,
    uint256 roleId
  );
  event ChannelRoleRemoved(
    address indexed caller,
    bytes32 channelId,
    uint256 roleId
  );
}

interface IChannel is IChannelBase {
  /// @notice creates a channel
  /// @param channelId the channelId of the channel
  /// @param metadata the metadata of the channel
  /// @param roleIds the roleIds to add to the channel
  function createChannel(
    bytes32 channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) external;

  /// @notice gets a channel
  /// @param channelId the channelId to get
  /// @return channel the channel
  function getChannel(
    bytes32 channelId
  ) external view returns (Channel memory channel);

  /// @notice gets all channels
  /// @return channels an array of all channels
  function getChannels() external view returns (Channel[] memory channels);

  /// @notice updates a channel
  /// @param channelId the channelId to update
  /// @param metadata the new metadata of the channel
  /// @param disabled whether or not the channel is disabled
  function updateChannel(
    bytes32 channelId,
    string memory metadata,
    bool disabled
  ) external;

  /// @notice removes a channel
  /// @param channelId the channelId to remove
  function removeChannel(bytes32 channelId) external;

  /// @notice gets all roles for a channel
  /// @param channelId the channelId to get the roles for
  /// @return roleIds an array of roleIds for the channel
  function getRolesByChannel(
    bytes32 channelId
  ) external view returns (uint256[] memory roleIds);

  /// @notice adds a role to a channel
  /// @param channelId the channelId to add the role to
  /// @param roleId the roleId to add to the channel
  function addRoleToChannel(bytes32 channelId, uint256 roleId) external;

  /// @notice removes a role from a channel
  /// @param channelId the channelId to remove the role from
  /// @param roleId the roleId to remove from the channel
  function removeRoleFromChannel(bytes32 channelId, uint256 roleId) external;
}
