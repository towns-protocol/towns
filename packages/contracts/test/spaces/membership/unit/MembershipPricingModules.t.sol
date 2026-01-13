// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

// interfaces

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts

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
        uint256 expectedPrice = MEMBERSHIP_PRICE + membership.getProtocolFee();
        assertEq(membership.getMembershipPrice(), expectedPrice);

        uint256 newPrice = 2 ether;

        vm.prank(founder);
        membership.setMembershipPrice(newPrice);

        uint256 protocolFee = (platformReqs.getMembershipBps() * newPrice) / 10000;
        uint256 minFee = platformReqs.getMembershipFee();

        protocolFee = FixedPointMathLib.max(protocolFee, minFee);

        expectedPrice = newPrice + protocolFee;
        assertEq(membership.getMembershipPrice(), expectedPrice);
    }
}
