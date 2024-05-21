// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IOwnableBase {
  error Ownable__ZeroAddress();
  error Ownable__NotOwner(address account);

  /// @dev This emits when ownership of a contract changes.
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );
}

interface IERC173 is IOwnableBase {
  /// @notice Get the address of the owner
  /// @return The address of the owner.
  function owner() external view returns (address);

  /// @notice Set the address of the new owner of the contract
  /// @dev Set _newOwner to address(0) to renounce any ownership.
  /// @param _newOwner The address of the new owner of the contract
  function transferOwnership(address _newOwner) external;
}
