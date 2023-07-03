// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {ChannelStorage} from "./ChannelStorage.sol";

// contracts
error ChannelService__ChannelAlreadyExists();
error ChannelService__ChannelDoesNotExist();
error ChannelService__ChannelDisabled();
error ChannelService__RoleAlreadyExists();
error ChannelService__RoleDoesNotExist();

library ChannelService {
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.UintSet;
  using ChannelStorage for ChannelStorage.Layout;

  // =============================================================
  //                      CRUD Operations
  // =============================================================

  function createChannel(
    string memory channelId,
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
      channel.rolesByChannelId[channelId].add(roleIds[i]);
    }
  }

  function getChannel(
    string memory channelId
  )
    internal
    view
    returns (string memory id, string memory metadata, bool disabled)
  {
    checkChannelExists(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();
    ChannelStorage.Channel memory channelInfo = channel.channelById[channelId];

    id = channelInfo.id;
    metadata = channelInfo.metadata;
    disabled = channelInfo.disabled;
  }

  function updateChannel(
    string memory channelId,
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

  function removeChannel(string memory channelId) internal {
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

  function getChannelIds() internal view returns (string[] memory) {
    ChannelStorage.Layout storage channel = ChannelStorage.layout();
    return channel.channelIds.values();
  }

  function addRoleToChannel(string memory channelId, uint256 roleId) internal {
    checkChannelExists(channelId);
    checkChannelNotDisabled(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    // check role isn't in channel already
    if (channel.rolesByChannelId[channelId].contains(roleId)) {
      revert ChannelService__RoleAlreadyExists();
    }

    channel.rolesByChannelId[channelId].add(roleId);
  }

  function removeRoleFromChannel(
    string memory channelId,
    uint256 roleId
  ) internal {
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
    string memory channelId
  ) internal view returns (uint256[] memory) {
    checkChannelExists(channelId);

    ChannelStorage.Layout storage channel = ChannelStorage.layout();
    return channel.rolesByChannelId[channelId].values();
  }

  // =============================================================
  //                        Validators
  // =============================================================

  function checkChannelNotDisabled(string memory channelId) internal view {
    ChannelStorage.Layout storage channel = ChannelStorage.layout();

    if (channel.channelById[channelId].disabled) {
      revert ChannelService__ChannelDisabled();
    }
  }

  function checkChannel(string memory channelId) internal view {
    // check that channel exists
    if (ChannelStorage.layout().channelIds.contains(channelId)) {
      revert ChannelService__ChannelAlreadyExists();
    }
  }

  function checkChannelExists(string memory channelId) internal view {
    // check that channel exists
    if (!ChannelStorage.layout().channelIds.contains(channelId)) {
      revert ChannelService__ChannelDoesNotExist();
    }
  }
}
