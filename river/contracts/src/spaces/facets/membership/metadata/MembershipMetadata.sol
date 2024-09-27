// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IMembershipMetadata} from "./IMembershipMetadata.sol";

// libraries
import {TokenOwnableStorage} from "contracts/src/diamond/facets/ownable/token/TokenOwnableStorage.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract MembershipMetadata is IMembershipMetadata, ERC721ABase, Facet {
  /// @inheritdoc IMembershipMetadata
  function refreshMetadata() external {
    emit IERC4906.BatchMetadataUpdate(0, type(uint256).max);
  }

  function tokenURI(uint256 tokenId) public view returns (string memory) {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
    TokenOwnableStorage.Layout storage ds = TokenOwnableStorage.layout();
    string memory baseURI = IERC721A(ds.collection).tokenURI(ds.tokenId);
    string memory tokenIdStr = LibString.toString(tokenId);
    return string.concat(baseURI, "/token/", tokenIdStr);
  }
}
