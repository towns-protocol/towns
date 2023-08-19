// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IOwnablePendingBase {
  /// @notice Thrown when the caller is not the pending owner.
  error OwnablePending_NotPendingOwner(address account);

  /**
   * @notice Emitted when ownership transfer is started.
   * @dev Finalized with {acceptOwnership}.
   */
  event OwnershipTransferStarted(
    address indexed previousOwner,
    address indexed newOwner
  );
}

interface IOwnablePending is IOwnablePendingBase {
  /**
   * @notice Returns the address of the pending owner, if there is one.
   * @return address of the pending owner.
   */
  function pendingOwner() external view returns (address);

  /**
   * @notice The new owner accepts the ownership transfer.
   */
  function acceptOwnership() external;
}
