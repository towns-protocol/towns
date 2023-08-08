//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";

interface IEntitlement {
  /// @notice The name of the entitlement module
  function name() external view returns (string memory);

  /// @notice The type of the entitlement module
  function moduleType() external view returns (string memory);

  /// @notice The description of the entitlement module
  function description() external view returns (string memory);

  function initialize(address _tokenAddress, uint256 _tokenId) external;

  /// @notice sets the address for the space that controls this entitlement
  /// @param _space address of the space
  function setSpace(address _space) external;

  /// @notice sets a new entitlement
  /// @param roleId id of the role to gate
  /// @param entitlementData abi encoded array of data necessary to set the entitlement
  /// @return entitlementId the id that was set
  function setEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external returns (bytes32);

  /// @notice removes an entitlement
  /// @param roleId id of the role to remove
  /// @param entitlementData abi encoded array of the data associated with that entitlement
  /// @return entitlementId the id that was removed
  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external returns (bytes32);

  /// @notice adds a role to a channel
  /// @param channelId id of the channel to add the role to
  /// @param roleId id of the role to add
  function addRoleIdToChannel(
    string calldata channelId,
    uint256 roleId
  ) external;

  /// @notice removes a role from a channel
  /// @param channelId id of the channel to remove the role from
  /// @param roleId id of the role to remove
  function removeRoleIdFromChannel(
    string calldata channelId,
    uint256 roleId
  ) external;

  /// @notice checks whether a user is has a given permission for a channel or a space
  /// @param channelId id of the channel to check, if empty string, checks space
  /// @param user address of the user to check
  /// @param permission the permission to check
  /// @return whether the user is entitled to the permission
  function isEntitled(
    string calldata channelId,
    address user,
    bytes32 permission
  ) external view returns (bool);

  /// @notice fetches the roleIds for a given channel
  /// @param channelId the channel to fetch the roleIds for
  /// @return roleIds array of all the roleIds for the channel
  function getRoleIdsByChannelId(
    string calldata channelId
  ) external view returns (uint256[] memory);

  /// @notice fetches the entitlement data for a roleId
  /// @param roleId the roleId to fetch the entitlement data for
  /// @return entitlementData array for the role
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory);

  /// @notice fetches the roles for a given user in the space
  /// @param user the user to fetch the roles for
  /// @return roles array of all the roles for the user
  function getUserRoles(
    address user
  ) external view returns (DataTypes.Role[] memory);
}
