// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ChannelStorage} from "./ChannelStorage.sol";

// contracts
error ChannelService__ChannelAlreadyExists();
error ChannelService__ChannelDoesNotExist();
error ChannelService__ChannelDisabled();
error ChannelService__RoleAlreadyExists();
error ChannelService__RoleDoesNotExist();

library ChannelService {
  using EnumerableSet for EnumerableSet.UintSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using ChannelStorage for ChannelStorage.Layout;

  // =============================================================
  //                      CRUD Operations
  // =============================================================

  function createChannel(
    bytes32 channelId,
    string memory metadata,
    uint256[] memory roleIds
  ) internal {
    checkChannel(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    channel.channelIds.add(channelId);
    channel.channelById[channelId] = ChannelStorage.Channel({
      id: channelId,
      disabled: false,
      metadata: metadata
    });

    for (uint256 i = 0; i < roleIds.length; i++) {
      // check if role already exists in channel
      if (channel.rolesByChannelId[channelId].contains(roleIds[i]))
        revert ChannelService__RoleAlreadyExists();
      channel.rolesByChannelId[channelId].add(roleIds[i]);
    }
  }

  function getChannel(
    bytes32 channelId
  ) internal view returns (bytes32 id, string memory metadata, bool disabled) {
    checkChannelExists(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();
    ChannelStorage.Channel memory channelInfo = channel.channelById[channelId];

    id = channelInfo.id;
    metadata = channelInfo.metadata;
    disabled = channelInfo.disabled;
  }

  function updateChannel(
    bytes32 channelId,
    string memory metadata,
    bool disabled
  ) internal {
    checkChannelExists(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    ChannelStorage.Channel storage channelInfo = channel.channelById[channelId];

    if (
      bytes(metadata).length > 0 &&
      keccak256(bytes(metadata)) != keccak256(bytes(channelInfo.metadata))
    ) {
      channelInfo.metadata = metadata;
    }

    if (channelInfo.disabled != disabled) {
      channelInfo.disabled = disabled;
    }
  }

  function removeChannel(bytes32 channelId) internal {
    checkChannelExists(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    channel.channelIds.remove(channelId);
    channel.channelById[channelId].metadata = "";
    channel.channelById[channelId].disabled = false;
    delete channel.channelById[channelId];

    // remove all roles from channel
    uint256[] memory roles = channel.rolesByChannelId[channelId].values();

    for (uint256 i = 0; i < roles.length; i++) {
      channel.rolesByChannelId[channelId].remove(roles[i]);
    }
  }

  function getChannelIds() internal view returns (bytes32[] memory) {
    ChannelStorage.Layout storage channel = ChannelStorage.layout();
    return channel.channelIds.values();
  }

  function getChannelIdsByRole(
    uint256 roleId
  ) internal view returns (bytes32[] memory channelIds) {
    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    uint256 potentialChannelsLength = channel.channelIds.length();
    uint256 count = 0;

    channelIds = new bytes32[](potentialChannelsLength);

    for (uint256 i = 0; i < potentialChannelsLength; ) {
      bytes32 channelId = channel.channelIds.at(i);

      if (channel.rolesByChannelId[channelId].contains(roleId)) {
        channelIds[count++] = channelId;
      }

      unchecked {
        i++;
      }
    }

    if (potentialChannelsLength > count) {
      assembly {
        let decrease := sub(potentialChannelsLength, count)
        mstore(channelIds, sub(mload(channelIds), decrease))
      }
    }
  }

  function addRoleToChannel(bytes32 channelId, uint256 roleId) internal {
    checkChannelExists(channelId);
    checkChannelNotDisabled(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    // check role isn't in channel already
    if (channel.rolesByChannelId[channelId].contains(roleId)) {
      revert ChannelService__RoleAlreadyExists();
    }

    channel.rolesByChannelId[channelId].add(roleId);
  }

  function removeRoleFromChannel(bytes32 channelId, uint256 roleId) internal {
    checkChannelExists(channelId);
    checkChannelNotDisabled(channelId);
    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    // check role exists in channel
    if (!channel.rolesByChannelId[channelId].contains(roleId)) {
      revert ChannelService__RoleDoesNotExist();
    }

    channel.rolesByChannelId[channelId].remove(roleId);
  }

  function getRolesByChannel(
    bytes32 channelId
  ) internal view returns (uint256[] memory) {
    checkChannelExists(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();
    return channel.rolesByChannelId[channelId].values();
  }

  // =============================================================
  //                        Validators
  // =============================================================

  function checkChannelNotDisabled(bytes32 channelId) internal view {
    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    if (channel.channelById[channelId].disabled) {
      revert ChannelService__ChannelDisabled();
    }
  }

  function checkChannel(bytes32 channelId) internal view {
    // check that channel exists
    if (ChannelStorage.layout().channelIds.contains(channelId)) {
      revert ChannelService__ChannelAlreadyExists();
    }
  }

  function checkChannelExists(bytes32 channelId) internal view {
    // check that channel exists
    if (!ChannelStorage.layout().channelIds.contains(channelId)) {
      revert ChannelService__ChannelDoesNotExist();
    }
  }
}
