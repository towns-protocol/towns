//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ISpaceOwner {
  /// @notice Mints a space nft to a given address
  /// @dev This function is called by the space factory only
  /// @param to The address to mint the nft to
  /// @param tokenURI The token URI of the nft
  /// @return tokenId The id of the minted nft
  function mintTo(
    address to,
    string calldata tokenURI
  ) external returns (uint256);
}
