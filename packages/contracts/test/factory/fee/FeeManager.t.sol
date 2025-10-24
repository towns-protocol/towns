// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// test base
import {FeeManagerBaseTest} from "./FeeManagerBase.t.sol";

// libraries
import {FeeCalculationMethod, FeeConfig} from "src/factory/facets/fee/FeeManagerStorage.sol";
import {FeeTypes} from "src/factory/facets/fee/FeeTypes.sol";

/// @title FeeManagerTest
/// @notice Unit tests for FeeManager facet
contract FeeManagerTest is FeeManagerBaseTest {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    FEE CONFIGURATION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setFeeConfig() external {
        bytes32 feeType = FeeTypes.TIP_MEMBER;

        vm.expectEmit(true, false, false, true);
        emit FeeConfigured(feeType, feeRecipient, FeeCalculationMethod.PERCENT, 50, 0, true);

        _configureFee(feeType, feeRecipient, FeeCalculationMethod.PERCENT, 50, 0, true);

        FeeConfig memory config = feeManager.getFeeConfig(feeType);
        assertEq(config.recipient, feeRecipient);
        assertEq(uint8(config.method), uint8(FeeCalculationMethod.PERCENT));
        assertEq(config.bps, 50);
        assertEq(config.fixedFee, 0);
        assertTrue(config.enabled);
    }

    function test_setFeeConfig_fixedMethod() external {
        bytes32 feeType = FeeTypes.MEMBERSHIP;
        uint160 fixedFee = 0.001 ether;

        _configureFee(feeType, feeRecipient, FeeCalculationMethod.FIXED, 0, fixedFee, true);

        FeeConfig memory config = feeManager.getFeeConfig(feeType);
        assertEq(uint8(config.method), uint8(FeeCalculationMethod.FIXED));
        assertEq(config.fixedFee, fixedFee);
    }

    function test_setFeeConfig_hybridMethod() external {
        bytes32 feeType = FeeTypes.APP_INSTALL;

        _configureFee(
            feeType,
            feeRecipient,
            FeeCalculationMethod.HYBRID,
            500, // 5%
            0.0005 ether,
            true
        );

        FeeConfig memory config = feeManager.getFeeConfig(feeType);
        assertEq(uint8(config.method), uint8(FeeCalculationMethod.HYBRID));
        assertEq(config.bps, 500);
        assertEq(config.fixedFee, 0.0005 ether);
    }

    function test_revertWhen_setFeeConfig_unauthorizedCaller() external {
        vm.expectRevert();
        vm.prank(testUser);
        feeManager.setFeeConfig(
            FeeTypes.TIP_MEMBER,
            feeRecipient,
            FeeCalculationMethod.PERCENT,
            50,
            0,
            true
        );
    }

    function test_revertWhen_setFeeConfig_invalidBps() external {
        vm.expectRevert(abi.encodeWithSelector(FeeManager__InvalidBps.selector));
        vm.prank(deployer);
        feeManager.setFeeConfig(
            FeeTypes.TIP_MEMBER,
            feeRecipient,
            FeeCalculationMethod.PERCENT,
            10_001, // > MAX_BPS
            0,
            true
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  FEE CALCULATION - FIXED                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_calculateFee_fixedMethod()
        external
        givenFixedFeeConfigured(FeeTypes.MEMBERSHIP, 0.001 ether)
    {
        uint256 fee = feeManager.calculateFee(FeeTypes.MEMBERSHIP, testUser, 1 ether, "");
        assertEq(fee, 0.001 ether);
    }

    function test_calculateFee_fixedMethod_independentOfAmount()
        external
        givenFixedFeeConfigured(FeeTypes.MEMBERSHIP, 0.001 ether)
    {
        uint256 fee1 = feeManager.calculateFee(FeeTypes.MEMBERSHIP, testUser, 1 ether, "");
        uint256 fee2 = feeManager.calculateFee(FeeTypes.MEMBERSHIP, testUser, 10 ether, "");

        assertEq(fee1, 0.001 ether);
        assertEq(fee2, 0.001 ether);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 FEE CALCULATION - PERCENT                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_calculateFee_percentMethod() external givenFeeConfigured(FeeTypes.TIP_MEMBER) {
        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, "");
        assertEq(fee, 0.005 ether); // 0.5% of 1 ether
    }

    function test_calculateFee_percentMethod_scales()
        external
        givenFeeConfigured(FeeTypes.TIP_MEMBER)
    {
        uint256 fee1 = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, "");
        uint256 fee2 = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 2 ether, "");

        assertEq(fee1, 0.005 ether);
        assertEq(fee2, 0.01 ether); // Double the amount = double the fee
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 FEE CALCULATION - HYBRID                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_calculateFee_hybridMethod_usesFixed() external {
        _configureFee(
            FeeTypes.APP_INSTALL,
            feeRecipient,
            FeeCalculationMethod.HYBRID,
            500, // 5%
            0.0005 ether,
            true
        );

        uint256 fee = feeManager.calculateFee(FeeTypes.APP_INSTALL, testUser, 0.001 ether, "");
        assertEq(fee, 0.0005 ether); // Fixed fee is larger than 5% of 0.001 ether
    }

    function test_calculateFee_hybridMethod_usesPercent() external {
        _configureFee(
            FeeTypes.APP_INSTALL,
            feeRecipient,
            FeeCalculationMethod.HYBRID,
            500, // 5%
            0.0005 ether,
            true
        );

        uint256 fee = feeManager.calculateFee(FeeTypes.APP_INSTALL, testUser, 1 ether, "");
        assertEq(fee, 0.05 ether); // 5% of 1 ether is larger than fixed fee
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  FEE CALCULATION - EDGE CASES              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_calculateFee_disabled() external {
        _configureFee(
            FeeTypes.TIP_MEMBER,
            feeRecipient,
            FeeCalculationMethod.PERCENT,
            50,
            0,
            false
        );

        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, "");
        assertEq(fee, 0);
    }

    function test_calculateFee_notConfigured() external {
        uint256 fee = feeManager.calculateFee(FeeTypes.BOT_ACTION, testUser, 1 ether, "");
        assertEq(fee, 0);
    }

    function test_calculateFee_zeroAmount() external givenFeeConfigured(FeeTypes.TIP_MEMBER) {
        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 0, "");
        assertEq(fee, 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      HOOK INTEGRATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_calculateFee_withExemptionHook()
        external
        givenFeeConfigured(FeeTypes.TIP_MEMBER)
    {
        address hook = _deployExemptionHook(testUser);
        _configureHook(FeeTypes.TIP_MEMBER, hook);

        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, "");
        assertEq(fee, 0); // testUser is exempt
    }

    function test_calculateFee_withExemptionHook_nonExemptUser()
        external
        givenFeeConfigured(FeeTypes.TIP_MEMBER)
    {
        address hook = _deployExemptionHook(address(0x999));
        _configureHook(FeeTypes.TIP_MEMBER, hook);

        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, "");
        assertEq(fee, 0.005 ether); // testUser not exempt, pays full fee
    }

    function test_calculateFee_withDiscountHook() external givenFeeConfigured(FeeTypes.TIP_MEMBER) {
        address hook = _deployDiscountHook(50); // 50% discount
        _configureHook(FeeTypes.TIP_MEMBER, hook);

        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, "");
        assertEq(fee, 0.0025 ether); // 50% of 0.005 ether
    }

    function test_setFeeHook() external {
        address hook = _deployExemptionHook(testUser);

        vm.expectEmit(true, false, false, true);
        emit FeeHookSet(FeeTypes.TIP_MEMBER, hook);

        _configureHook(FeeTypes.TIP_MEMBER, hook);

        assertEq(feeManager.getFeeHook(FeeTypes.TIP_MEMBER), hook);
    }

    function test_setFeeHook_remove() external {
        address hook = _deployExemptionHook(testUser);
        _configureHook(FeeTypes.TIP_MEMBER, hook);

        _configureHook(FeeTypes.TIP_MEMBER, address(0));

        assertEq(feeManager.getFeeHook(FeeTypes.TIP_MEMBER), address(0));
    }

    function test_revertWhen_setFeeHook_unauthorizedCaller() external {
        address hook = _deployExemptionHook(testUser);

        vm.expectRevert();
        vm.prank(testUser);
        feeManager.setFeeHook(FeeTypes.TIP_MEMBER, hook);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    GLOBAL FEE RECIPIENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setGlobalFeeRecipient() external {
        address newRecipient = _randomAddress();

        vm.expectEmit(false, false, false, true);
        emit GlobalFeeRecipientSet(newRecipient);

        _setGlobalRecipient(newRecipient);

        assertEq(feeManager.getGlobalFeeRecipient(), newRecipient);
    }

    function test_revertWhen_setGlobalFeeRecipient_zeroAddress() external {
        vm.expectRevert(abi.encodeWithSelector(FeeManager__InvalidRecipient.selector));
        vm.prank(deployer);
        feeManager.setGlobalFeeRecipient(address(0));
    }

    function test_revertWhen_setGlobalFeeRecipient_unauthorizedCaller() external {
        vm.expectRevert();
        vm.prank(testUser);
        feeManager.setGlobalFeeRecipient(_randomAddress());
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CHARGE FEE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_chargeFee_nativeToken() external givenFeeConfigured(FeeTypes.TIP_MEMBER) {
        uint256 tipAmount = 1 ether;
        uint256 expectedFee = 0.005 ether;

        vm.deal(testUser, tipAmount);

        uint256 recipientBalanceBefore = feeRecipient.balance;

        vm.expectEmit(true, true, false, true);
        emit FeeCharged(FeeTypes.TIP_MEMBER, testUser, expectedFee, feeRecipient, address(0));

        vm.prank(testUser);
        uint256 fee = feeManager.chargeFee{value: expectedFee}(
            FeeTypes.TIP_MEMBER,
            testUser,
            tipAmount,
            address(0),
            ""
        );

        assertEq(fee, expectedFee);
        assertEq(feeRecipient.balance, recipientBalanceBefore + expectedFee);
    }

    function test_chargeFee_disabled() external {
        _configureFee(
            FeeTypes.TIP_MEMBER,
            feeRecipient,
            FeeCalculationMethod.PERCENT,
            50,
            0,
            false
        );

        vm.prank(testUser);
        uint256 fee = feeManager.chargeFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, address(0), "");

        assertEq(fee, 0);
    }

    function test_chargeFee_withExemption() external givenFeeConfigured(FeeTypes.TIP_MEMBER) {
        address hook = _deployExemptionHook(testUser);
        _configureHook(FeeTypes.TIP_MEMBER, hook);

        vm.prank(testUser);
        uint256 fee = feeManager.chargeFee(FeeTypes.TIP_MEMBER, testUser, 1 ether, address(0), "");

        assertEq(fee, 0); // Exempt user pays nothing
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getFeeConfig() external givenFeeConfigured(FeeTypes.TIP_MEMBER) {
        FeeConfig memory config = feeManager.getFeeConfig(FeeTypes.TIP_MEMBER);

        assertEq(config.recipient, feeRecipient);
        assertEq(uint8(config.method), uint8(FeeCalculationMethod.PERCENT));
        assertEq(config.bps, 50);
        assertTrue(config.enabled);
    }

    function test_getFeeHook() external {
        address hook = _deployExemptionHook(testUser);
        _configureHook(FeeTypes.TIP_MEMBER, hook);

        assertEq(feeManager.getFeeHook(FeeTypes.TIP_MEMBER), hook);
    }

    function test_getGlobalFeeRecipient() external {
        assertEq(feeManager.getGlobalFeeRecipient(), deployer);
    }
}
