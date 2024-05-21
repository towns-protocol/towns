// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IMetadata} from "./interfaces/IMetadata.sol";

// libraries

// contracts

abstract contract Metadata is IMetadata {
  string public override contractURI;

  /// inheritdoc IMetadata
  function setContractURI(string calldata _uri) external override {
    if (!_canSetContractURI()) revert("Metadata: not authorized");
    _setContractURI(_uri);
  }

  function _setContractURI(string memory _uri) internal {
    string memory prevURI = contractURI;
    contractURI = _uri;

    emit ContractURIUpdated(prevURI, _uri);
  }

  function _canSetContractURI() internal view virtual returns (bool);
}
