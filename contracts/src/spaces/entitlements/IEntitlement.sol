//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

interface IEntitlementBase {
  // Caller is not allowed to perform this action
  error Entitlement__NotAllowed();

  // Caller has passed an invalid value
  error Entitlement__InvalidValue();

  // Caller has passed a value that already exists
  error Entitlement__ValueAlreadyExists();

  // Caller is not a member
  error Entitlement__NotMember();
}

interface IEntitlement is IEntitlementBase {
  /// @notice initializes the entitlement module
  function initialize(address space) external;

  /// @notice The name of the entitlement module
  function name() external view returns (string memory);

  /// @notice The type of the entitlement module
  function moduleType() external view returns (string memory);

  /// @notice The description of the entitlement module
  function description() external view returns (string memory);

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

  /// @notice fetches the entitlement data for a roleId
  /// @param roleId the roleId to fetch the entitlement data for
  /// @return entitlementData array for the role
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes[] memory);
}
