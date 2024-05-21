// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMetadata {
  /// @dev Emitted when the contract URI is updated.
  event ContractURIUpdated(string prevURI, string newURI);

  /// @dev Returns the contract URI.
  function contractURI() external view returns (string memory);

  /// @dev Sets the contract URI.
  function setContractURI(string calldata _uri) external;
}
