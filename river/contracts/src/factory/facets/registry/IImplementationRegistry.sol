// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
interface IImplementationRegistryBase {
  // =============================================================
  //                           Errors
  // =============================================================
  error InvalidContractType();
  error InvalidVersion();

  // =============================================================
  //                           Events
  // =============================================================
  event ImplementationAdded(
    address implementation,
    bytes32 contractType,
    uint32 version
  );
  event ImplementationApproved(address implementation, bool approved);
}

interface IImplementationRegistry is IImplementationRegistryBase {
  /// @notice Add an implementation to the registry
  /// @param implementation The address of the implementation
  function addImplementation(address implementation) external;

  /// @notice Approve or disapprove an implementation
  /// @param implementation The address of the implementation
  /// @param approval The approval status
  function approveImplementation(
    address implementation,
    bool approval
  ) external;

  /// @notice Get an implementation by contract type and version
  /// @param contractType The contract type
  /// @param version The version
  /// @return The address of the implementation
  function getImplementation(
    bytes32 contractType,
    uint32 version
  ) external view returns (address);

  /// @notice Get the latest implementation by contract type
  /// @param contractType The contract type
  /// @return The address of the latest implementation
  function getLatestImplementation(
    bytes32 contractType
  ) external view returns (address);
}
