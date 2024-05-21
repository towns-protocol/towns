// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title BatchMintMetadata
/// @dev This contract is used to set the metadata for a batch of tokens all at once. This is enabled by storing a single
/// base URI for a batch of `n` NFTs, where the metadata for each NFT in a relevant batch is `baseURI/tokenId
contract BatchMintMetadata {
  /// @dev tokenIds for a batch of NFTs that share the same base URI
  uint256[] private _batchTokenIds;

  /// @dev base URI for a batch of NFTs
  mapping(uint256 => string) private _batchTokenURIs;

  /// @notice returns the count of batches of NFTs
  /// @dev each batch of NFTs has an ID and an associated base URI
  function getBaseURICount() public view returns (uint256) {
    return _batchTokenIds.length;
  }

  /// @notice returns the ID for the batch of tokens the given tokenId is a part of
  /// @param _index the index of the batch of tokens
  function getBatchIdAtIndex(uint256 _index) external view returns (uint256) {
    if (_index >= getBaseURICount()) {
      revert("BatchMintMetadata: index out of bounds");
    }

    return _batchTokenIds[_index];
  }

  // =============================================================
  //                           Internal
  // =============================================================
  /// @notice Returns the id for the batch of tokens the given tokenId is a part of
  /// @param _tokenId the tokenId to get the batch id for
  function _getBatchId(
    uint256 _tokenId
  ) internal view returns (uint256 batchId, uint256 index) {
    uint256 numOfTokenBatches = getBaseURICount();
    uint256[] memory indices = _batchTokenIds;

    for (uint256 i = 0; i < numOfTokenBatches; i++) {
      if (indices[i] == _tokenId) {
        index = i;
        batchId = indices[i];

        return (batchId, index);
      }
    }

    revert("BatchMintMetadata: batch id not found");
  }

  /// @notice Returns the base URI for a token. The metadata URI for a token is baseURI + tokenId
  function _getBaseURI(uint256 _tokenId) internal view returns (string memory) {
    uint256 numOfTokenBatches = getBaseURICount();
    uint256[] memory indices = _batchTokenIds;

    for (uint256 i = 0; i < numOfTokenBatches; i++) {
      if (_tokenId < indices[i]) {
        return _batchTokenURIs[indices[i]];
      }
    }

    revert("BatchMintMetadata: base URI not found");
  }

  /// @notice Sets the base URI for a batch of tokens with the given tokenIds
  function _setBaseURI(uint256 _batchId, string memory _baseURI) internal {
    _batchTokenURIs[_batchId] = _baseURI;
  }

  /// @notice Mints a batch of tokenIds and sets the base URI for the batch
  function _batchMintMetadata(
    uint256 _startId,
    uint256 _amountToMint,
    string memory _baseURIForTokens
  ) internal returns (uint256 nextTokenIdToMint, uint256 batchId) {
    batchId = _startId + _amountToMint;
    nextTokenIdToMint = batchId;

    _batchTokenIds.push(batchId);
    _setBaseURI(batchId, _baseURIForTokens);
  }
}
