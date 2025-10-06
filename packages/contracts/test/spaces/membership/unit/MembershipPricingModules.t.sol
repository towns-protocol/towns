// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces

//libraries

//contracts

contract MembershipPricingModulesTest is MembershipBaseSetup {
    function test_setPricingModule() public {
        address currentModule = membership.getMembershipPricingModule();

        // current module is fixedPrice we want to change it to dynamicPrice
        assertNotEq(currentModule, pricingModule);

        vm.prank(founder);
        membership.setMembershipPricingModule(pricingModule);

        assertEq(membership.getMembershipPricingModule(), pricingModule);
    }

    function test_revertWhen_setPricingModuleNotOwner() public {
        address random = _randomAddress();

        vm.prank(random);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, random));
        membership.setMembershipPricingModule(pricingModule);
    }

    function test_revertWhen_setPricingModuleNotApproved() public {
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidPricingModule.selector);
        membership.setMembershipPricingModule(_randomAddress());
    }

    function test_revertWhen_setPricingModuleZeroAddress() public {
        vm.prank(founder);
        vm.expectRevert(Membership__InvalidPricingModule.selector);
        membership.setMembershipPricingModule(address(0));
    }

    function test_setMembershipPrice() public givenMembershipHasPrice {
        // With fee-added model, getMembershipPrice() returns base + protocol fee
        uint256 expectedTotalPrice = MEMBERSHIP_PRICE + membership.getProtocolFee();
        assertEq(membership.getMembershipPrice(), expectedTotalPrice);

        uint256 newBasePrice = 2 ether;

        vm.prank(founder);
        membership.setMembershipPrice(newBasePrice);

        // Calculate expected total with new base price
        uint256 protocolFee = (platformReqs.getMembershipBps() * newBasePrice) / 10000;
        uint256 minFee = platformReqs.getMembershipFee();
        protocolFee = protocolFee > minFee ? protocolFee : minFee;
        uint256 expectedNewTotal = newBasePrice + protocolFee;

        assertEq(membership.getMembershipPrice(), expectedNewTotal);
    }
}
