// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";
import {Events} from "../libraries/Events.sol";
import {Constants} from "../libraries/Constants.sol";
import {Utils} from "../libraries/Utils.sol";
import {IERC165} from "openzeppelin-contracts/contracts/interfaces/IERC165.sol";

library CreationLogic {
  function createSpace(
    DataTypes.CreateSpaceData calldata info,
    uint256 spaceId,
    address creator,
    mapping(bytes32 => uint256) storage _spaceIdByHash,
    mapping(uint256 => DataTypes.Space) storage _spaceById
  ) external {
    Utils.validateName(info.spaceName);

    bytes32 networkHash = keccak256(bytes(info.spaceNetworkId));

    if (_spaceIdByHash[networkHash] != 0)
      revert Errors.SpaceAlreadyRegistered();

    _spaceIdByHash[networkHash] = spaceId;
    _spaceById[spaceId].spaceId = spaceId;
    _spaceById[spaceId].createdAt = block.timestamp;
    _spaceById[spaceId].name = info.spaceName;
    _spaceById[spaceId].networkId = info.spaceNetworkId;
    _spaceById[spaceId].creator = creator;
    _spaceById[spaceId].owner = creator;
  }

  function createChannel(
    DataTypes.CreateChannelData calldata info,
    uint256 spaceId,
    uint256 channelId,
    address creator,
    mapping(uint256 => DataTypes.Channels) storage _channelsBySpaceId,
    mapping(uint256 => mapping(bytes32 => uint256))
      storage _channelIdBySpaceIdByHash,
    mapping(uint256 => mapping(uint256 => DataTypes.Channel))
      storage _channelBySpaceIdByChannelId
  ) external {
    Utils.validateName(info.channelName);

    bytes32 networkHash = keccak256(bytes(info.channelNetworkId));

    if (_channelIdBySpaceIdByHash[spaceId][networkHash] != 0) {
      revert Errors.SpaceAlreadyRegistered();
    }

    _channelIdBySpaceIdByHash[spaceId][networkHash] = channelId;

    _channelBySpaceIdByChannelId[spaceId][channelId].channelId = channelId;
    _channelBySpaceIdByChannelId[spaceId][channelId].createdAt = block
      .timestamp;
    _channelBySpaceIdByChannelId[spaceId][channelId].networkId = info
      .channelNetworkId;
    _channelBySpaceIdByChannelId[spaceId][channelId].name = info.channelName;
    _channelBySpaceIdByChannelId[spaceId][channelId].creator = creator;

    _channelsBySpaceId[spaceId].channels.push(
      _channelBySpaceIdByChannelId[spaceId][channelId]
    );
  }

  function setPermission(
    uint256 spaceId,
    uint256 roleId,
    DataTypes.Permission memory permission,
    mapping(uint256 => mapping(uint256 => DataTypes.Permission[]))
      storage _permissionsBySpaceIdByRoleId
  ) internal {
    _permissionsBySpaceIdByRoleId[spaceId][roleId].push(permission);
  }

  function createRole(
    uint256 spaceId,
    string memory name,
    mapping(uint256 => DataTypes.Roles) storage _rolesBySpaceId
  ) internal returns (uint256) {
    uint256 roleId = _rolesBySpaceId[spaceId].idCounter++;
    _rolesBySpaceId[spaceId].roles.push(DataTypes.Role(roleId, name));
    return roleId;
  }

  function setEntitlement(
    uint spaceId,
    address entitlementModule,
    bool whitelist,
    mapping(uint256 => DataTypes.Space) storage _spaceById
  ) external {
    // set entitlement tag to space entitlement tags
    _spaceById[spaceId].hasEntitlement[entitlementModule] = whitelist;

    // set entitlement address to space entitlements
    if (whitelist) {
      _spaceById[spaceId].entitlementModules.push(entitlementModule);
    } else {
      uint256 len = _spaceById[spaceId].entitlementModules.length;
      for (uint256 i = 0; i < len; ) {
        if (_spaceById[spaceId].entitlementModules[i] == entitlementModule) {
          // Remove the entitlement address from the space entitlements
          _spaceById[spaceId].entitlementModules[i] = _spaceById[spaceId]
            .entitlementModules[len - 1];
          _spaceById[spaceId].entitlementModules.pop();
        }

        unchecked {
          ++i;
        }
      }
    }
  }
}
