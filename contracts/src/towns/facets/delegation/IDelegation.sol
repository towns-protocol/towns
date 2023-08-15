// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IDelegationBase {
  struct DelegationInfo {
    address vault;
    address delegate;
  }

  /// @notice Emitted when a user delegates their entire wallet
  event DelegateForAll(address vault, address delegate, bool value);

  /// @notice Emitted when a user revokes all delegations
  event RevokeAllDelegates(address vault);

  /// @notice Emitted when a user revoes all delegations for a given delegate
  event RevokeDelegate(address vault, address delegate);

  // =============================================================
  //                      Errors
  // =============================================================
  error DelegateAlreadyExists(address vault, address delegate);
}

interface IDelegation is IDelegationBase {
  /**
   *
   * @param delegate The address to act on your behalf
   * @param value Whether to enable or disable delegation for this address
   */
  function delegateForAll(address delegate, bool value) external;

  /**
   * @notice Revoke all delegates for a given vault
   */
  function revokeAllDelegates() external;

  /**
   * @notice Revoke a specific delegate for all their permissions
   * @param delegate The address to revoke
   */
  function revokeDelegate(address delegate) external;

  // =============================================================
  //                      External - Read
  // =============================================================

  /**
   * @notice Get all delegations for a given delegate
   * @param delegate The delegate to query
   * @return info An array of delegation info
   */
  function getDelegationsByDelegate(
    address delegate
  ) external view returns (DelegationInfo[] memory info);

  /**
   * @notice Returns an array of wallet-level delegates for a given vault
   * @param vault The cold wallet who issued the delegation
   * @return addresses Array of wallet-level delegates for a given vault
   */
  function getDelegatesForAll(
    address vault
  ) external view returns (address[] memory);

  /**
   * @notice Returns true if the address is delegated to act on the entire vault
   * @param delegate The wallet to act on your behalf
   * @param vault The cold wallet who issued the delegation
   */
  function checkDelegateForAll(
    address delegate,
    address vault
  ) external view returns (bool);
}
