// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";

//libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

//mocks

import {MockERC1155} from "test/mocks/MockERC1155.sol";
import {MockERC721} from "test/mocks/MockERC721.sol";

contract MembershipTreasuryTest is MembershipBaseSetup {
    MockERC721 test721;
    MockERC1155 test1155;

    function setUp() public override {
        super.setUp();
        test721 = new MockERC721();
        test1155 = new MockERC1155();
    }

    function test_withdraw() external givenMembershipHasPrice givenAliceHasPaidMembership {
        address multisig = _randomAddress();

        // With fee-added model, the space receives the full asking price
        uint256 revenue = membership.revenue();
        assertEq(revenue, MEMBERSHIP_PRICE);

        vm.prank(founder);
        treasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, multisig);

        assertEq(multisig.balance, MEMBERSHIP_PRICE);
    }

    function test_revertWhen_withdrawNotOwner() external {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        treasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, alice);
    }

    function test_revertWhen_withdrawInvalidAddress() external givenFounderIsCaller {
        vm.expectRevert(Membership__InvalidAddress.selector);
        treasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, address(0));
    }

    function test_revertWhen_withdrawZeroBalance() external givenFounderIsCaller {
        vm.expectRevert(Membership__InsufficientPayment.selector);
        treasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, founder);
    }

    // Integration
    // test withdraw a second time
    function test_withdrawSecondTime()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
    {
        vm.prank(founder);
        treasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, founder);

        // With fee-added model, founder receives full base price
        assertEq(founder.balance, MEMBERSHIP_PRICE);

        // For the second join, charlie needs to pay base price + protocol fee
        uint256 totalPrice = membership.getMembershipPrice();

        vm.startPrank(charlie);
        vm.deal(charlie, totalPrice);
        membership.joinSpace{value: totalPrice}(charlie);
        assertEq(membershipToken.balanceOf(charlie), 1);
        vm.stopPrank();

        vm.prank(founder);
        treasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, founder);

        assertEq(founder.balance, MEMBERSHIP_PRICE * 2);
    }

    // ERC721
    function test_erc721_safeMint() external {
        vm.prank(_randomAddress());
        uint256 tokenId = test721.safeMint(address(membership));
        assertEq(test721.ownerOf(tokenId), address(membership));
    }

    // ERC1155
    function test_erc1155_safeMint() external {
        uint256 tokenId = 1;
        uint256 amount = 1;

        vm.prank(_randomAddress());
        test1155.safeMint(address(membership), tokenId, amount);

        assertTrue(test1155.directCheckOfReceived(address(membership)));
        assertEq(test1155.balanceOf(address(membership), tokenId), amount);
    }

    function test_erc1155_safeMintBatch() external {
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = 1;
        tokenIds[1] = 2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1;
        amounts[1] = 1;

        vm.prank(_randomAddress());
        test1155.safeMintBatch(address(membership), tokenIds, amounts);

        assertTrue(test1155.directCheckOfReceivedBatch(address(membership)));
        assertEq(test1155.balanceOf(address(membership), tokenIds[0]), amounts[0]);
        assertEq(test1155.balanceOf(address(membership), tokenIds[1]), amounts[1]);
    }
}
