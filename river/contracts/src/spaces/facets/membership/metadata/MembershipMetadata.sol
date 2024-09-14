// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries
import {TokenOwnableStorage} from "contracts/src/diamond/facets/ownable/token/TokenOwnableStorage.sol";

// contracts
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract MembershipMetadata is ERC721ABase, Facet {
  function tokenURI(uint256 tokenId) public view returns (string memory) {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
    TokenOwnableStorage.Layout storage ds = TokenOwnableStorage.layout();
    return IERC721A(ds.collection).tokenURI(ds.tokenId);
  }
}
