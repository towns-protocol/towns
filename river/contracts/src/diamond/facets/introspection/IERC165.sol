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

/**
 * @title IERC165
 * @notice Interface of the ERC165 standard. See [EIP-165](https://eips.ethereum.org/EIPS/eip-165).
 */
interface IERC165 is IIntrospectionBase {
  /**
   * @notice Returns true if this contract implements the interface
   * @param interfaceId The 4 bytes interface identifier, as specified in ERC-165
   * @dev Has to be manually set by a facet at initialization.
   */
  function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
