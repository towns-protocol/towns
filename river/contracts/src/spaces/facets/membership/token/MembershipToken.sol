// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {BanningBase} from "contracts/src/spaces/facets/banning/BanningBase.sol";

contract MembershipToken is ERC721A, BanningBase, IMembershipBase {
  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 tokenId,
    uint256 quantity
  ) internal override {
    if (from != address(0) && _isBanned(tokenId)) {
      revert Membership__Banned();
    }
    super._beforeTokenTransfers(from, to, tokenId, quantity);
  }
}
