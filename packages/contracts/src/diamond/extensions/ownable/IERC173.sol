// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
interface IERC173Events {
  /// @dev This emits when ownership of a contract changes.
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );
}

interface IERC173 is IERC173Events {
  /// @notice Get the address of the owner
  /// @return The address of the owner.
  function owner() external view returns (address);

  /// @notice Set the address of the new owner of the contract
  /// @dev Set _newOwner to address(0) to renounce any ownership.
  /// @param _newOwner The address of the new owner of the contract
  function transferOwnership(address _newOwner) external;
}
