// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IChannelBase} from "./IChannel.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {ChannelStorage} from "./ChannelStorage.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts

library ChannelService {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using ChannelStorage for ChannelStorage.Layout;
    using CustomRevert for bytes4;
    using LibString for string;

    // =============================================================
    //                      CRUD Operations
    // =============================================================

    function createChannel(
        bytes32 channelId,
        string calldata metadata,
        uint256[] memory roleIds
    ) internal {
        checkChannel(channelId);

        ChannelStorage.Layout storage channel = ChannelStorage.layout();

        channel.channelIds.add(channelId);
        ChannelStorage.Channel storage channelInfo = channel.channelById[channelId];
        (channelInfo.id, channelInfo.metadata) = (channelId, metadata);

        EnumerableSet.UintSet storage roles = channel.rolesByChannelId[channelId];
        for (uint256 i; i < roleIds.length; ++i) {
            // check if role already exists in channel
            if (roles.contains(roleIds[i])) {
                IChannelBase.ChannelService__RoleAlreadyExists.selector.revertWith();
            }
            roles.add(roleIds[i]);
        }
    }

    function updateChannel(bytes32 channelId, string calldata metadata, bool disabled) internal {
        checkChannelExists(channelId);

        ChannelStorage.Layout storage channel = ChannelStorage.layout();
        ChannelStorage.Channel storage channelInfo = channel.channelById[channelId];

        if (bytes(metadata).length > 0 && !metadata.eq(channelInfo.metadata)) {
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
        delete channel.channelById[channelId];

        // remove all roles from channel
        channel.rolesByChannelId[channelId].clear();
    }

    function addRoleToChannel(bytes32 channelId, uint256 roleId) internal {
        checkChannelExists(channelId);
        checkChannelNotDisabled(channelId);

        // check role isn't in channel already
        ChannelStorage.Layout storage channel = ChannelStorage.layout();
        EnumerableSet.UintSet storage roles = channel.rolesByChannelId[channelId];
        if (roles.contains(roleId)) {
            IChannelBase.ChannelService__RoleAlreadyExists.selector.revertWith();
        }

        roles.add(roleId);
    }

    function removeRoleFromChannel(bytes32 channelId, uint256 roleId) internal {
        checkChannelExists(channelId);
        checkChannelNotDisabled(channelId);

        // check role exists in channel
        ChannelStorage.Layout storage channel = ChannelStorage.layout();
        EnumerableSet.UintSet storage roles = channel.rolesByChannelId[channelId];
        if (!roles.contains(roleId)) {
            IChannelBase.ChannelService__RoleDoesNotExist.selector.revertWith();
        }

        roles.remove(roleId);
    }

    function getChannel(
        bytes32 channelId
    ) internal view returns (bytes32 id, string memory metadata, bool disabled) {
        checkChannelExists(channelId);

        ChannelStorage.Layout storage channel = ChannelStorage.layout();
        ChannelStorage.Channel storage channelInfo = channel.channelById[channelId];

        id = channelInfo.id;
        metadata = channelInfo.metadata;
        disabled = channelInfo.disabled;
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

        for (uint256 i; i < potentialChannelsLength; ++i) {
            bytes32 channelId = channel.channelIds.at(i);

            if (channel.rolesByChannelId[channelId].contains(roleId)) {
                unchecked {
                    channelIds[count++] = channelId;
                }
            }
        }

        // resize the array to the actual number of channels
        assembly ("memory-safe") {
            mstore(channelIds, count)
        }
    }

    function getRolesByChannel(bytes32 channelId) internal view returns (uint256[] memory) {
        checkChannelExists(channelId);
        ChannelStorage.Layout storage channel = ChannelStorage.layout();
        return channel.rolesByChannelId[channelId].values();
    }

    // =============================================================
    //                        Validators
    // =============================================================

    function checkChannelNotDisabled(bytes32 channelId) internal view {
        if (ChannelStorage.layout().channelById[channelId].disabled) {
            IChannelBase.ChannelService__ChannelDisabled.selector.revertWith();
        }
    }

    function checkChannel(bytes32 channelId) internal view {
        // check that channel exists
        if (ChannelStorage.layout().channelIds.contains(channelId)) {
            IChannelBase.ChannelService__ChannelAlreadyExists.selector.revertWith();
        }
    }

    function checkChannelExists(bytes32 channelId) internal view {
        // check that channel exists
        if (!ChannelStorage.layout().channelIds.contains(channelId)) {
            IChannelBase.ChannelService__ChannelDoesNotExist.selector.revertWith();
        }
    }
}
