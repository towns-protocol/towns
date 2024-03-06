// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

interface ITowns {
  /// @notice emitted when transfers are enabled/disabled
  /// @param enabled true if enabling transfers, false if disabling transfers
  event TransfersSet(bool enabled);

  /// @notice emitted when transfers are enabled/disabled for a specific address
  /// @param transferee the address to allow or disallow transfers for
  /// @param allowed true if allowing transfers, false if disallowing transfers
  event AllowedTransfersSet(address indexed transferee, bool allowed);

  /// @notice called when enabling or disabling transfers
  /// @param enabled true if enabling transfers, false if disabling transfers
  function setTransfers(bool enabled) external;

  /// @notice called when enabling or disabling transfers for a specific address
  /// @param transferee the address to allow or disallow transfers for
  /// @param allowed true if allowing transfers, false if disallowing transfers
  function setAllowedTransfers(address transferee, bool allowed) external;
}
