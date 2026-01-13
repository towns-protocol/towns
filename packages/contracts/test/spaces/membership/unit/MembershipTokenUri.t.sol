// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces
import {IERC4906} from "@openzeppelin/contracts/interfaces/IERC4906.sol";
import {IMembershipMetadata} from "src/spaces/facets/membership/metadata/IMembershipMetadata.sol";

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

// contracts
import {ERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/ERC721AQueryable.sol";

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

    function test_tokenUri() external givenMembershipHasPrice givenAliceHasPaidMembership {
        uint256[] memory tokenIds = ERC721AQueryable(address(membership)).tokensOfOwner(alice);

        uint256 tokenId = tokenIds[0];

        string memory uri = membershipToken.tokenURI(tokenId);
        assertEq(uri, "ipfs://test/token/1");
    }

    function test_refreshMetadata() external {
        vm.expectEmit(address(membership));
        emit IERC4906.BatchMetadataUpdate(0, type(uint256).max);
        IMembershipMetadata(address(membership)).refreshMetadata();
    }
}
