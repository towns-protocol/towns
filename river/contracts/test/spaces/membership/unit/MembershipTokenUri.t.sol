// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//contracts
import {ERC721AQueryable} from "contracts/src/diamond/facets/token/ERC721A/extensions/ERC721AQueryable.sol";

contract MembershipTokenUriTest is MembershipBaseSetup {
  function test_setMembershipImage()
    external
    givenMembershipHasPrice
    givenAliceHasPaidMembership
  {
    string memory image = "https://example.com/image.png";

    vm.prank(founder);
    membership.setMembershipImage(image);

    assertEq(membership.getMembershipImage(), image);
  }

  function test_tokenUri()
    external
    givenMembershipHasPrice
    givenAliceHasPaidMembership
  {
    uint256[] memory tokenIds = ERC721AQueryable(address(membership))
      .tokensOfOwner(alice);

    uint256 tokenId = tokenIds[0];

    string memory uri = membership.tokenURI(tokenId);
    assertTrue(
      keccak256(abi.encodePacked(uri)) != keccak256(abi.encodePacked(""))
    );
  }
}
