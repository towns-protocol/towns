// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeeManager, IFeeManagerBase} from "src/factory/facets/fee/IFeeManager.sol";
import {IFeeHook, FeeHookResult} from "src/factory/facets/fee/IFeeHook.sol";
import {FeeCalculationMethod} from "src/factory/facets/fee/FeeManagerStorage.sol";

// libraries

// contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";

/// @title FeeManagerBaseTest
/// @notice Base test contract with setup and helper functions for FeeManager tests
abstract contract FeeManagerBaseTest is BaseSetup, IFeeManagerBase {
    IFeeManager internal feeManager;
    address internal feeRecipient;
    address internal testUser;

    function setUp() public virtual override {
        super.setUp();

        feeManager = IFeeManager(spaceFactory);
        feeRecipient = deployer;
        testUser = founder;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SETUP HELPERS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _configureFee(
        bytes32 feeType,
        address recipient,
        FeeCalculationMethod method,
        uint16 bps,
        uint128 fixedFee,
        bool enabled
    ) internal {
        vm.prank(deployer);
        feeManager.setFeeConfig(feeType, recipient, method, bps, fixedFee, enabled);
    }

    function _configureHook(bytes32 feeType, address hook) internal {
        vm.prank(deployer);
        feeManager.setFeeHook(feeType, hook);
    }

    function _setProtocolFeeRecipient(address recipient) internal {
        vm.prank(deployer);
        feeManager.setProtocolFeeRecipient(recipient);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        MOCK HOOKS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _deployExemptionHook(address exemptUser) internal returns (address) {
        MockExemptionHook hook = new MockExemptionHook(exemptUser);
        return address(hook);
    }

    function _deployDiscountHook(uint256 discountPercent) internal returns (address) {
        MockDiscountHook hook = new MockDiscountHook(discountPercent);
        return address(hook);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TEST MODIFIERS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier givenFeeConfigured(bytes32 feeType) {
        _configureFee(feeType, feeRecipient, FeeCalculationMethod.PERCENT, 50, 0, true);
        _;
    }

    modifier givenFixedFeeConfigured(bytes32 feeType, uint128 fixedFee) {
        _configureFee(feeType, feeRecipient, FeeCalculationMethod.FIXED, 0, fixedFee, true);
        _;
    }

    modifier givenHookConfigured(bytes32 feeType, address hook) {
        _configureHook(feeType, hook);
        _;
    }
}

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                        MOCK CONTRACTS                      */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/// @notice Mock hook that exempts a specific user
contract MockExemptionHook is IFeeHook {
    address public exemptUser;

    constructor(address _exemptUser) {
        exemptUser = _exemptUser;
    }

    function calculateFee(
        bytes32 /* feeType */,
        address user,
        uint256 baseFee,
        bytes calldata /* context */
    ) external view returns (FeeHookResult memory) {
        bool exempt = user == exemptUser;
        return FeeHookResult({finalFee: exempt ? 0 : baseFee, metadata: ""});
    }

    function onChargeFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) external view returns (FeeHookResult memory) {
        return this.calculateFee(feeType, user, baseFee, context);
    }
}

/// @notice Mock hook that applies a percentage discount
contract MockDiscountHook is IFeeHook {
    uint256 public discountPercent; // 0-100

    constructor(uint256 _discountPercent) {
        discountPercent = _discountPercent;
    }

    function calculateFee(
        bytes32 /* feeType */,
        address /* user */,
        uint256 baseFee,
        bytes calldata /* context */
    ) external view returns (FeeHookResult memory) {
        uint256 discount = (baseFee * discountPercent) / 100;
        uint256 finalFee = baseFee - discount;

        return FeeHookResult({finalFee: finalFee, metadata: ""});
    }

    function onChargeFee(
        bytes32 feeType,
        address user,
        uint256 baseFee,
        bytes calldata context
    ) external view returns (FeeHookResult memory) {
        return this.calculateFee(feeType, user, baseFee, context);
    }
}
