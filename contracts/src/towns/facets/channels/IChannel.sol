// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IChannelBase {
  // =============================================================
  //                           Structs
  // =============================================================
  struct Channel {
    string id;
    bool disabled;
    string metadata;
    uint256[] roleIds;
  }

  // =============================================================
  //                           Events
  // =============================================================
  event ChannelCreated(address indexed caller, string channelId);
  event ChannelUpdated(address indexed caller, string channelId);
  event ChannelRemoved(address indexed caller, string channelId);
  event ChannelRoleAdded(
    address indexed caller,
    string channelId,
    uint256 roleId
  );
  event ChannelRoleRemoved(
    address indexed caller,
    string channelId,
    uint256 roleId
  );
}

interface IChannel is IChannelBase {
  /// @notice creates a channel
  /// @param channelId the channelId of the channel
  /// @param metadata the metadata of the channel
  /// @param roleIds the roleIds to add to the channel
  function createChannel(
    string memory channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) external;

  /// @notice gets a channel
  /// @param channelId the channelId to get
  /// @return channel the channel
  function getChannel(
    string memory channelId
  ) external view returns (Channel memory channel);

  /// @notice gets all channels
  /// @return channels an array of all channels
  function getChannels() external view returns (Channel[] memory channels);

  /// @notice updates a channel
  /// @param channelId the channelId to update
  /// @param metadata the new metadata of the channel
  /// @param disabled whether or not the channel is disabled
  function updateChannel(
    string memory channelId,
    string memory metadata,
    bool disabled
  ) external;

  /// @notice removes a channel
  /// @param channelId the channelId to remove
  function removeChannel(string memory channelId) external;

  /// @notice adds a role to a channel
  /// @param channelId the channelId to add the role to

  /// @param roleId the roleId to add to the channel
  function addRoleToChannel(string calldata channelId, uint256 roleId) external;

  /// @notice removes a role from a channel
  /// @param channelId the channelId to remove the role from
  /// @param roleId the roleId to remove from the channel
  function removeRoleFromChannel(
    string calldata channelId,
    uint256 roleId
  ) external;
}
