// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IFeeHook, FeeHookResult} from "src/factory/facets/fee/IFeeHook.sol";

// libraries
import {Validator} from "src/utils/libraries/Validator.sol";

// contracts
import {DomainFeeHook} from "src/domains/hooks/DomainFeeHook.sol";

// test setup
import {L2ResolverBaseSetup} from "./setup/L2ResolverBaseSetup.sol";

/// @title FeeHookCaller
/// @notice Helper contract to simulate FeeManager calling onChargeFee
contract FeeHookCaller {
    function callOnChargeFee(
        IFeeHook hook,
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) external returns (FeeHookResult memory) {
        return hook.onChargeFee(feeType, user, baseFee, context);
    }
}

/// @title DomainFeeHookTest
/// @notice Unit tests for DomainFeeHook
contract DomainFeeHookTest is L2ResolverBaseSetup {
    uint256 internal constant DEFAULT_PRICE = 10 ether;

    DomainFeeHook internal feeHook;
    FeeHookCaller internal feeManager;

    function setUp() public override {
        super.setUp();
        feeManager = new FeeHookCaller();
        feeHook = new DomainFeeHook(deployer, address(feeManager), DEFAULT_PRICE);
    }

    function test_initialization() external {
        assertEq(feeHook.getDefaultPrice(), DEFAULT_PRICE, "Default price should be set");
        assertEq(feeHook.owner(), deployer, "Owner should be deployer");
        assertEq(feeHook.getFeeManager(), address(feeManager), "FeeManager should be set");
    }

    function test_calculateFee_firstIsFree() external {
        bytes memory context = abi.encode(uint256(5)); // label length
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);

        assertEq(result.finalFee, 0, "First registration should be free");
    }

    function test_onChargeFee_firstIsFree() external {
        bytes memory context = abi.encode(uint256(5)); // label length
        FeeHookResult memory result = feeManager.callOnChargeFee(
            IFeeHook(address(feeHook)),
            bytes32(0),
            alice,
            0,
            context
        );

        assertEq(result.finalFee, 0, "First registration should be free");
        assertEq(feeHook.getRegistrationCount(alice), 1, "Registration count should be 1");
    }

    function test_calculateFee_secondChargesDefault() external {
        // First registration
        bytes memory context = abi.encode(uint256(5));
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        // Second registration should charge
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Second registration should charge default price");
    }

    function test_onChargeFee_incrementsCount() external {
        bytes memory context = abi.encode(uint256(5));

        // First call
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);
        assertEq(feeHook.getRegistrationCount(alice), 1);

        // Second call
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);
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
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        // Second registration should use tier price
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, shortPrice, "Should use tier price");
    }

    function test_calculateFee_fallsBackToDefault() external {
        // Do first registration
        bytes memory context = abi.encode(uint256(10)); // No tier for 10-char labels
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

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

    function test_revertWhen_setPriceTiers_tooManyLengths() external {
        uint256[] memory lengths = new uint256[](11);
        uint256[] memory prices = new uint256[](11);

        for (uint256 i; i < 11; ++i) {
            lengths[i] = i + 1;
            prices[i] = (i + 1) * 1 ether;
        }

        vm.prank(deployer);
        vm.expectRevert(DomainFeeHook.DomainFeeHook__TooManyLengths.selector);
        feeHook.setPriceTiers(lengths, prices);
    }

    function test_setPriceTiers_maxLength() external {
        // Exactly 10 should succeed
        uint256[] memory lengths = new uint256[](10);
        uint256[] memory prices = new uint256[](10);

        for (uint256 i; i < 10; ++i) {
            lengths[i] = i + 1;
            prices[i] = (i + 1) * 1 ether;
        }

        vm.prank(deployer);
        feeHook.setPriceTiers(lengths, prices);

        // Verify all tiers were set
        for (uint256 i; i < 10; ++i) {
            assertEq(feeHook.getPrice(lengths[i]), prices[i], "Tier should be set");
        }
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
        feeManager.callOnChargeFee(
            IFeeHook(address(feeHook)),
            bytes32(0),
            alice,
            0,
            abi.encode(uint256(5))
        );

        vm.expectRevert(DomainFeeHook.DomainFeeHook__InvalidContext.selector);
        feeHook.calculateFee(bytes32(0), alice, 0, shortContext);
    }

    function test_onChargeFee_onlyFeeManager() external {
        bytes memory context = abi.encode(uint256(5));

        // Should revert when called by unauthorized address
        vm.prank(alice);
        vm.expectRevert(DomainFeeHook.DomainFeeHook__Unauthorized.selector);
        feeHook.onChargeFee(bytes32(0), alice, 0, context);
    }

    function test_setFeeManager() external {
        address newFeeManager = _randomAddress();

        vm.prank(deployer);
        feeHook.setFeeManager(newFeeManager);

        assertEq(feeHook.getFeeManager(), newFeeManager, "FeeManager should be updated");
    }

    function test_revertWhen_setFeeManager_notOwner() external {
        vm.prank(alice);
        vm.expectRevert();
        feeHook.setFeeManager(_randomAddress());
    }

    function test_revertWhen_constructor_zeroFeeManager() external {
        // Constructor should revert when feeManager is zero address
        vm.expectRevert(Validator.InvalidAddress.selector);
        new DomainFeeHook(deployer, address(0), DEFAULT_PRICE);
    }

    function test_revertWhen_setFeeManager_zeroAddress() external {
        vm.prank(deployer);
        vm.expectRevert(Validator.InvalidAddress.selector);
        feeHook.setFeeManager(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                            EDGE CASES
    //////////////////////////////////////////////////////////////*/

    function test_calculateFee_labelLengthZero() external {
        bytes memory context = abi.encode(uint256(0));

        // First registration should be free regardless of label length
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, 0, "First registration should be free");

        // After first registration
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        // Second registration with label length 0 should use default price (no tier for 0)
        result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Should use default price for length 0");
    }

    function test_calculateFee_labelLengthOne() external {
        bytes memory context = abi.encode(uint256(1));

        // First registration
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        // Second registration with label length 1 should use default price
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Should use default price for length 1");
    }

    function test_calculateFee_maxLabelLength() external {
        uint256 maxLength = type(uint256).max;
        bytes memory context = abi.encode(maxLength);

        // First registration
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        // Second registration with max label length should use default price
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Should use default price for max length");
    }

    function test_setPriceTier_toZero() external {
        // Set a price tier
        vm.prank(deployer);
        feeHook.setPriceTier(5, 100 ether);
        assertEq(feeHook.getPrice(5), 100 ether, "Price tier should be set");

        // Set the same tier to 0 (should fall back to default)
        vm.prank(deployer);
        feeHook.setPriceTier(5, 0);

        // getPrice should return default when tier is 0
        assertEq(feeHook.getPrice(5), DEFAULT_PRICE, "Should fall back to default when tier is 0");
    }

    function test_setPriceTier_overwrite() external {
        // Set initial price tier
        vm.prank(deployer);
        feeHook.setPriceTier(5, 100 ether);
        assertEq(feeHook.getPrice(5), 100 ether);

        // Overwrite with new price
        vm.prank(deployer);
        feeHook.setPriceTier(5, 200 ether);
        assertEq(feeHook.getPrice(5), 200 ether, "Price tier should be overwritten");
    }

    function test_setDefaultPrice_toZero() external {
        vm.prank(deployer);
        feeHook.setDefaultPrice(0);
        assertEq(feeHook.getDefaultPrice(), 0, "Default price should be 0");

        // After first registration, second should be free if default is 0
        bytes memory context = abi.encode(uint256(5));
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, 0, "Fee should be 0 when default price is 0");
    }

    function test_multipleConcurrentUsers() external {
        bytes memory context = abi.encode(uint256(5));
        address user1 = _randomAddress();
        address user2 = _randomAddress();
        address user3 = _randomAddress();

        // User1: 2 registrations
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), user1, 0, context);
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), user1, 0, context);

        // User2: 1 registration
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), user2, 0, context);

        // User3: 0 registrations

        assertEq(feeHook.getRegistrationCount(user1), 2, "User1 should have 2 registrations");
        assertEq(feeHook.getRegistrationCount(user2), 1, "User2 should have 1 registration");
        assertEq(feeHook.getRegistrationCount(user3), 0, "User3 should have 0 registrations");

        // Verify fee calculations are independent per user
        FeeHookResult memory result1 = feeHook.calculateFee(bytes32(0), user1, 0, context);
        FeeHookResult memory result2 = feeHook.calculateFee(bytes32(0), user2, 0, context);
        FeeHookResult memory result3 = feeHook.calculateFee(bytes32(0), user3, 0, context);

        assertEq(result1.finalFee, DEFAULT_PRICE, "User1 should pay default price");
        assertEq(result2.finalFee, DEFAULT_PRICE, "User2 should pay default price");
        assertEq(result3.finalFee, 0, "User3 should get first free");
    }

    function test_calculateFee_contextExactly32Bytes() external {
        // Exactly 32 bytes should work
        bytes memory context = abi.encode(uint256(5));
        assertEq(context.length, 32, "Context should be exactly 32 bytes");

        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Should calculate fee with 32 byte context");
    }

    function test_calculateFee_contextMoreThan32Bytes() external {
        // More than 32 bytes should work (extra bytes ignored)
        bytes memory context = abi.encode(uint256(5), uint256(999));
        assertGt(context.length, 32, "Context should be more than 32 bytes");

        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Should calculate fee with > 32 byte context");
    }

    function test_setPriceTiers_empty() external {
        uint256[] memory lengths = new uint256[](0);
        uint256[] memory prices = new uint256[](0);

        // Empty arrays should succeed
        vm.prank(deployer);
        feeHook.setPriceTiers(lengths, prices);

        // Verify default still works
        assertEq(feeHook.getPrice(5), DEFAULT_PRICE);
    }

    function test_setPriceTiers_single() external {
        uint256[] memory lengths = new uint256[](1);
        uint256[] memory prices = new uint256[](1);
        lengths[0] = 3;
        prices[0] = 50 ether;

        vm.prank(deployer);
        feeHook.setPriceTiers(lengths, prices);

        assertEq(feeHook.getPrice(3), 50 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_calculateFee_labelLength(uint256 labelLength) external {
        vm.assume(labelLength < type(uint128).max); // Reasonable bound

        bytes memory context = abi.encode(labelLength);

        // First registration should always be free
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, 0, "First registration should be free");

        // Do first registration
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        // Second registration should charge default price (no tier set)
        result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Second should charge default price");
    }

    function testFuzz_setPriceTier(uint256 length, uint256 price) external {
        length = bound(length, 1, 999); // Reasonable label lengths
        price = bound(price, 1, type(uint128).max - 1);

        vm.prank(deployer);
        feeHook.setPriceTier(length, price);

        assertEq(feeHook.getPrice(length), price, "Price tier should be set correctly");
    }

    function testFuzz_setPriceTier_anyLength(uint256 length, uint256 price) external {
        // Test with any length value
        vm.prank(deployer);
        feeHook.setPriceTier(length, price);

        if (price == 0) {
            // If price is 0, should fall back to default
            assertEq(feeHook.getPrice(length), DEFAULT_PRICE, "Should fall back to default");
        } else {
            assertEq(feeHook.getPrice(length), price, "Price tier should be set");
        }
    }

    function testFuzz_setDefaultPrice(uint256 price) external {
        vm.prank(deployer);
        feeHook.setDefaultPrice(price);

        assertEq(feeHook.getDefaultPrice(), price, "Default price should be set");
    }

    function testFuzz_registrationCount(uint8 registrations) external {
        vm.assume(registrations > 0 && registrations <= 100); // Reasonable bound for gas

        bytes memory context = abi.encode(uint256(5));

        for (uint256 i = 0; i < registrations; i++) {
            feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);
        }

        assertEq(
            feeHook.getRegistrationCount(alice),
            registrations,
            "Registration count should match"
        );
    }

    function testFuzz_multipleUsers_independentCounts(
        uint8 user1Count,
        uint8 user2Count,
        uint8 user3Count
    ) external {
        vm.assume(user1Count <= 50 && user2Count <= 50 && user3Count <= 50); // Bound for gas

        bytes memory context = abi.encode(uint256(5));
        address user1 = _randomAddress();
        address user2 = _randomAddress();
        address user3 = _randomAddress();

        for (uint256 i = 0; i < user1Count; i++) {
            feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), user1, 0, context);
        }
        for (uint256 i = 0; i < user2Count; i++) {
            feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), user2, 0, context);
        }
        for (uint256 i = 0; i < user3Count; i++) {
            feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), user3, 0, context);
        }

        assertEq(feeHook.getRegistrationCount(user1), user1Count, "User1 count mismatch");
        assertEq(feeHook.getRegistrationCount(user2), user2Count, "User2 count mismatch");
        assertEq(feeHook.getRegistrationCount(user3), user3Count, "User3 count mismatch");
    }

    function testFuzz_calculateFee_withTier(uint256 labelLength, uint256 tierPrice) external {
        labelLength = bound(labelLength, 1, 99);
        tierPrice = bound(tierPrice, 1, type(uint128).max - 1);

        // Set tier price
        vm.prank(deployer);
        feeHook.setPriceTier(labelLength, tierPrice);

        bytes memory context = abi.encode(labelLength);

        // First registration is free
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, 0, "First registration should be free");

        // Do first registration
        feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);

        // Second registration should use tier price
        result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, tierPrice, "Should use tier price");
    }

    function testFuzz_setPriceTiers_batch(uint8 count) external {
        vm.assume(count > 0 && count <= 10); // Max 10 tiers per batch

        uint256[] memory lengths = new uint256[](count);
        uint256[] memory prices = new uint256[](count);

        for (uint256 i = 0; i < count; ++i) {
            lengths[i] = i + 1; // Start from 1 to avoid 0
            prices[i] = (i + 1) * 1 ether;
        }

        vm.prank(deployer);
        feeHook.setPriceTiers(lengths, prices);

        // Verify all tiers were set
        for (uint256 i = 0; i < count; ++i) {
            assertEq(feeHook.getPrice(lengths[i]), prices[i], "Batch tier mismatch");
        }
    }

    function testFuzz_feeCalculation_afterMultipleRegistrations(uint8 registrations) external {
        vm.assume(registrations > 0 && registrations <= 100);

        bytes memory context = abi.encode(uint256(5));

        // Register multiple times
        for (uint256 i = 0; i < registrations; i++) {
            feeManager.callOnChargeFee(IFeeHook(address(feeHook)), bytes32(0), alice, 0, context);
        }

        // Fee should always be DEFAULT_PRICE after first registration
        FeeHookResult memory result = feeHook.calculateFee(bytes32(0), alice, 0, context);
        assertEq(result.finalFee, DEFAULT_PRICE, "Should charge default price after first");
    }

    function testFuzz_setFeeManager(address newFeeManager) external {
        vm.assume(newFeeManager != address(0));

        vm.prank(deployer);
        feeHook.setFeeManager(newFeeManager);

        assertEq(feeHook.getFeeManager(), newFeeManager, "FeeManager should be updated");
    }

    function testFuzz_onChargeFee_onlyAuthorizedCaller(address caller) external {
        vm.assume(caller != address(feeManager));

        bytes memory context = abi.encode(uint256(5));

        vm.prank(caller);
        vm.expectRevert(DomainFeeHook.DomainFeeHook__Unauthorized.selector);
        feeHook.onChargeFee(bytes32(0), alice, 0, context);
    }

    function testFuzz_invalidContext_lessThan32Bytes(uint8 contextLength) external {
        vm.assume(contextLength < 32);

        bytes memory shortContext = new bytes(contextLength);

        // First registration to get past free check
        feeManager.callOnChargeFee(
            IFeeHook(address(feeHook)),
            bytes32(0),
            alice,
            0,
            abi.encode(uint256(5))
        );

        vm.expectRevert(DomainFeeHook.DomainFeeHook__InvalidContext.selector);
        feeHook.calculateFee(bytes32(0), alice, 0, shortContext);
    }

    function testFuzz_constructor_initialization(
        address owner,
        address feeManagerAddr,
        uint256 defaultPrice
    ) external {
        vm.assume(owner != address(0));
        vm.assume(feeManagerAddr != address(0));

        DomainFeeHook newHook = new DomainFeeHook(owner, feeManagerAddr, defaultPrice);

        assertEq(newHook.owner(), owner, "Owner should be set");
        assertEq(newHook.getFeeManager(), feeManagerAddr, "FeeManager should be set");
        assertEq(newHook.getDefaultPrice(), defaultPrice, "Default price should be set");
    }

    function testFuzz_setPriceTiers_tooManyLengths(uint8 count) external {
        vm.assume(count > 10);

        uint256[] memory lengths = new uint256[](count);
        uint256[] memory prices = new uint256[](count);

        for (uint256 i; i < count; ++i) {
            lengths[i] = i + 1;
            prices[i] = (i + 1) * 1 ether;
        }

        vm.prank(deployer);
        vm.expectRevert(DomainFeeHook.DomainFeeHook__TooManyLengths.selector);
        feeHook.setPriceTiers(lengths, prices);
    }
}
