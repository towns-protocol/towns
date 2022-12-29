//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {DataTypes} from "../libraries/DataTypes.sol";

interface IEntitlement {
  /// @notice The name of the entitlement module
  function name() external view returns (string memory);

  /// @notice The type of the entitlement module
  function moduleType() external view returns (string memory);

  /// @notice The description of the entitlement module
  function description() external view returns (string memory);

  function setSpace(address _space) external;

  function setEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external returns (bytes32);

  function removeEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external returns (bytes32);

  function addRoleIdToChannel(
    string calldata channelId,
    uint256 roleId
  ) external;

  function removeRoleIdFromChannel(
    string calldata channelId,
    uint256 roleId
  ) external;

  function isEntitled(
    string calldata channelId,
    address user,
    bytes32 permission
  ) external view returns (bool);

  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory);

  function getUserRoles(
    address user
  ) external view returns (DataTypes.Role[] memory);
}
