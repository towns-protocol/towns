// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IChannel} from "./IChannel.sol";

// libraries
import {Permissions} from "src/spaces/facets/Permissions.sol";

// contracts

import {ChannelBase} from "./ChannelBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {Entitled} from "src/spaces/facets/Entitled.sol";
import {RolesBase} from "src/spaces/facets/roles/RolesBase.sol";

contract Channels is IChannel, ChannelBase, RolesBase, Entitled, Facet {
    function createChannel(
        bytes32 channelId,
        string calldata metadata,
        uint256[] calldata roleIds
    ) external {
        _validatePermission(Permissions.AddRemoveChannels);
        _createChannel(channelId, metadata, roleIds);
    }

    function createChannelWithOverridePermissions(
        bytes32 channelId,
        string calldata metadata,
        RolePermissions[] calldata rolePermissions
    ) external {
        _validatePermission(Permissions.AddRemoveChannels);

        uint256[] memory roleIds = new uint256[](rolePermissions.length);
        for (uint256 i; i < rolePermissions.length; ++i) {
            roleIds[i] = rolePermissions[i].roleId;
        }
        _createChannel(channelId, metadata, roleIds);

        for (uint256 i; i < rolePermissions.length; ++i) {
            _setChannelPermissionOverrides(
                rolePermissions[i].roleId,
                channelId,
                rolePermissions[i].permissions
            );
        }
    }

    function getChannel(bytes32 channelId) external view returns (Channel memory channel) {
        return _getChannel(channelId);
    }

    function getChannels() external view returns (Channel[] memory channels) {
        return _getChannels();
    }

    function updateChannel(bytes32 channelId, string calldata metadata, bool disabled) external {
        _validatePermission(Permissions.AddRemoveChannels);
        _updateChannel(channelId, metadata, disabled);
    }

    function removeChannel(bytes32 channelId) external {
        _validatePermission(Permissions.AddRemoveChannels);
        _removeChannel(channelId);
    }

    function addRoleToChannel(bytes32 channelId, uint256 roleId) external {
        _validatePermission(Permissions.AddRemoveChannels);
        _addRoleToChannel(channelId, roleId);
    }

    function getRolesByChannel(bytes32 channelId) external view returns (uint256[] memory roleIds) {
        return _getRolesByChannel(channelId);
    }

    function removeRoleFromChannel(bytes32 channelId, uint256 roleId) external {
        _validatePermission(Permissions.AddRemoveChannels);
        _removeRoleFromChannel(channelId, roleId);
    }
}
