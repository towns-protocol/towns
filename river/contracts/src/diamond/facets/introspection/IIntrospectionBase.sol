// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IIntrospectionBase {
  error Introspection_AlreadySupported();
  error Introspection_NotSupported();

  /**
   * @notice Emitted when an interface is added to the contract via `_addInterface`.
   */
  event InterfaceAdded(bytes4 indexed interfaceId);

  /**
   * @notice Emitted when an interface is removed from the contract via `_removeInterface`.
   */
  event InterfaceRemoved(bytes4 indexed interfaceId);
}
