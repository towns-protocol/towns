// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IMetadataBase {
  /// @dev Emitted when the contract URI is changed
  event ContractURIChanged(string uri);
}

interface IMetadata is IMetadataBase {
  /// @dev Returns the contract type
  function contractType() external view returns (bytes32);

  /// @dev Returns the contract version
  function contractVersion() external view returns (uint32);

  /// @dev Returns the metadata URI of the contract
  function contractURI() external view returns (string memory);

  /// @dev Sets the metadata URI of the contract
  function setContractURI(string calldata uri) external;
}
