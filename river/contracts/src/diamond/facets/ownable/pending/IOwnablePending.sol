// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

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
   * @notice Initialize a transfer of ownership.
   * @param newOwner The address of the new owner.
   */
  function startTransferOwnership(address newOwner) external;

  /**
   * @notice The new owner accepts the ownership transfer.
   */
  function acceptOwnership() external;

  /**
   * @notice Returns the address of the current owner.
   * @return address of the current owner.
   */
  function currentOwner() external view returns (address);

  /**
   * @notice Returns the address of the pending owner, if there is one.
   * @return address of the pending owner.
   */
  function pendingOwner() external view returns (address);
}
