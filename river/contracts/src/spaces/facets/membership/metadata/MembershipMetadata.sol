// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {ERC721AStorage} from "contracts/src/diamond/facets/token/ERC721A/ERC721AStorage.sol";
import {Base64} from "base64/base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// contracts
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {BanningBase} from "contracts/src/spaces/facets/banning/BanningBase.sol";
import {MembershipBase} from "contracts/src/spaces/facets/membership/MembershipBase.sol";
import {ERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/ERC5643Base.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract MembershipMetadata is
  MembershipBase,
  ERC721ABase,
  ERC5643Base,
  BanningBase,
  Facet
{
  function _render(
    uint256 tokenId
  ) internal view virtual returns (string memory) {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

    ERC721AStorage.Layout storage ds = ERC721AStorage.layout();

    return
      string(
        abi.encodePacked(
          "data:application/json;base64,",
          Base64.encode(
            abi.encodePacked(
              '{"name":"',
              ds._name,
              '","image":"',
              _getMembershipImage(),
              '","attributes":[{"trait_type":"Renewal Price","display_type": "number", "value":"',
              Strings.toString(
                _getMembershipRenewalPrice(tokenId, _totalSupply())
              ),
              '"},{"trait_type":"Membership Expiration","display_type": "number", "value":"',
              Strings.toString(_expiresAt(tokenId)),
              '"},{"trait_type":"Membership Banned", "value":"',
              _isBanned(tokenId) ? "true" : "false",
              '"}]}'
            )
          )
        )
      );
  }

  function tokenURI(uint256 tokenId) public view returns (string memory) {
    return _render(tokenId);
  }
}
