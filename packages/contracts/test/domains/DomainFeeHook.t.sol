// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {FeeHookResult} from "src/factory/facets/fee/IFeeHook.sol";

// contracts
import {DomainFeeHook} from "src/domains/facets/registrar/DomainFeeHook.sol";

// test setup
import {L2ResolverBaseSetup} from "./setup/L2ResolverBaseSetup.sol";

/// @title DomainFeeHookTest
/// @notice Unit tests for DomainFeeHook
contract DomainFeeHookTest is L2ResolverBaseSetup {
    uint256 internal constant DEFAULT_PRICE = 10 ether;

    DomainFeeHook internal feeHook;

    function setUp() public override {
        super.setUp();
        feeHook = new DomainFeeHook(deployer, DEFAULT_PRICE);
    }

    function test_initialization() external {
        assertEq(feeHook.getDefaultPrice(), DEFAULT_PRICE, "Default price should be set");
        assertEq(feeHook.owner(), deployer, "Owner should be deployer");
    }

    function test_calculateFee_firstIsFree() external {
        bytes memory context = abi.encode(uint256(5)); // label length
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);

        assertEq(result.finalFee, 0, "First registration should be free");
    }

    function test_onChargeFee_firstIsFree() external {
        bytes memory context = abi.encode(uint256(5)); // label length
        FeeHookResult memory result = feeHook.onChargeFee(bytes32(0), alice, 0, context);

        assertEq(result.finalFee, 0, "First registration should be free");
        assertEq(feeHook.getRegistrationCount(alice), 1, "Registration count should be 1");
    }

    function test_calculateFee_secondChargesDefault() external {
        // First registration
        bytes memory context = abi.encode(uint256(5));
        feeHook.onChargeFee(bytes32(0), alice, 0, context);

        // Second registration should charge
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Second registration should charge default price");
    }

    function test_onChargeFee_incrementsCount() external {
        bytes memory context = abi.encode(uint256(5));

        // First call
        feeHook.onChargeFee(bytes32(0), alice, 0, context);
        assertEq(feeHook.getRegistrationCount(alice), 1);

        // Second call
        feeHook.onChargeFee(bytes32(0), alice, 0, context);
        assertEq(feeHook.getRegistrationCount(alice), 2);
    }

    function test_setPriceTier() external {
        uint256 shortPrice = 100 ether;

        vm.prank(deployer);
        feeHook.setPriceTier(3, shortPrice);

        assertEq(feeHook.getPrice(3), shortPrice, "Price tier should be set");
    }

    function test_calculateFee_usesTier() external {
        uint256 shortPrice = 100 ether;

        // Set tier for 3-char labels
        vm.prank(deployer);
        feeHook.setPriceTier(3, shortPrice);

        // Do first registration to make next one paid
        bytes memory context = abi.encode(uint256(3));
        feeHook.onChargeFee(bytes32(0), alice, 0, context);

        // Second registration should use tier price
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, shortPrice, "Should use tier price");
    }

    function test_calculateFee_fallsBackToDefault() external {
        // Do first registration
        bytes memory context = abi.encode(uint256(10)); // No tier for 10-char labels
        feeHook.onChargeFee(bytes32(0), alice, 0, context);

        // Second registration should use default
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Should fall back to default price");
    }

    function test_setPriceTiers_batch() external {
        uint256[] memory lengths = new uint256[](3);
        uint256[] memory prices = new uint256[](3);
        lengths[0] = 3;
        lengths[1] = 4;
        lengths[2] = 5;
        prices[0] = 100 ether;
        prices[1] = 50 ether;
        prices[2] = 25 ether;

        vm.prank(deployer);
        feeHook.setPriceTiers(lengths, prices);

        assertEq(feeHook.getPrice(3), 100 ether);
        assertEq(feeHook.getPrice(4), 50 ether);
        assertEq(feeHook.getPrice(5), 25 ether);
    }

    function test_revertWhen_setPriceTiers_lengthMismatch() external {
        uint256[] memory lengths = new uint256[](3);
        uint256[] memory prices = new uint256[](2);

        vm.prank(deployer);
        vm.expectRevert(DomainFeeHook.DomainFeeHook__LengthMismatch.selector);
        feeHook.setPriceTiers(lengths, prices);
    }

    function test_setDefaultPrice() external {
        uint256 newPrice = 50 ether;

        vm.prank(deployer);
        feeHook.setDefaultPrice(newPrice);

        assertEq(feeHook.getDefaultPrice(), newPrice);
    }

    function test_revertWhen_setDefaultPrice_notOwner() external {
        vm.prank(alice);
        vm.expectRevert();
        feeHook.setDefaultPrice(50 ether);
    }

    function test_revertWhen_setPriceTier_notOwner() external {
        vm.prank(alice);
        vm.expectRevert();
        feeHook.setPriceTier(3, 100 ether);
    }

    function test_getPrice_withTier() external {
        vm.prank(deployer);
        feeHook.setPriceTier(3, 100 ether);

        assertEq(feeHook.getPrice(3), 100 ether);
    }

    function test_getPrice_fallbackToDefault() external {
        assertEq(feeHook.getPrice(10), DEFAULT_PRICE);
    }

    function test_revertWhen_invalidContext() external {
        bytes memory shortContext = abi.encodePacked(uint8(1)); // Too short

        // First registration to get past free check
        feeHook.onChargeFee(bytes32(0), alice, 0, abi.encode(uint256(5)));

        vm.expectRevert(DomainFeeHook.DomainFeeHook__InvalidContext.selector);
        feeHook.calculateFee(bytes32(0), alice, 0, shortContext);
    }
}
