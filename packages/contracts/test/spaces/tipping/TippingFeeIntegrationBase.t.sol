// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";
import {ITipping, ITippingBase} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import {FeeCalculationMethod} from "src/factory/facets/fee/FeeManagerStorage.sol";
import {FeeTypes} from "src/factory/facets/fee/FeeTypes.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {StakingExemptionHook} from "src/factory/facets/fee/hooks/StakingExemptionHook.sol";

/// @title TippingFeeIntegrationBaseTest
/// @notice Base test contract with setup and helper functions for tipping integration tests
abstract contract TippingFeeIntegrationBaseTest is BaseSetup {
    IFeeManager internal feeManager;
    ITipping internal tipping;
    StakingExemptionHook internal stakingHook;

    address internal tipper;
    address internal tipReceiver;
    address internal feeRecipient;

    uint256 internal constant TIP_AMOUNT = 1 ether;
    uint256 internal constant EXPECTED_FEE = 0.005 ether; // 0.5% of 1 ether
    uint256 internal constant STAKING_EXEMPTION_THRESHOLD = 1000 ether;

    function setUp() public virtual override {
        super.setUp();

        feeManager = IFeeManager(spaceFactory);
        tipping = ITipping(everyoneSpace);
        feeRecipient = deployer;

        tipper = _randomAddress();
        tipReceiver = _randomAddress();

        // Deploy staking exemption hook
        stakingHook = new StakingExemptionHook(baseRegistry, deployer);

        // Configure TIP_MEMBER fee
        _configureTippingFee();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SETUP HELPERS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _configureTippingFee() internal {
        vm.startPrank(deployer);
        feeManager.setFeeConfig(
            FeeTypes.TIP_MEMBER,
            feeRecipient,
            FeeCalculationMethod.PERCENT,
            50, // 0.5%
            0,
            true
        );
        vm.stopPrank();
    }

    function _configureStakingHook() internal {
        vm.startPrank(deployer);
        stakingHook.setExemptionThreshold(FeeTypes.TIP_MEMBER, STAKING_EXEMPTION_THRESHOLD);
        feeManager.setFeeHook(FeeTypes.TIP_MEMBER, address(stakingHook));
        vm.stopPrank();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TIPPING HELPERS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _sendMemberTip(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 actualTipAmount) {
        // User sends the full amount, fee is deducted internally
        vm.deal(from, amount);

        ITippingBase.MembershipTipParams memory params = ITippingBase.MembershipTipParams({
            receiver: to,
            tokenId: 1,
            currency: CurrencyTransfer.NATIVE_TOKEN,
            amount: amount,
            metadata: ITippingBase.TipMetadata({
                messageId: bytes32(uint256(1)),
                channelId: bytes32(uint256(2)),
                data: ""
            })
        });

        vm.prank(from);
        tipping.sendTip{value: amount}(ITippingBase.TipRecipientType.Member, abi.encode(params));

        // Calculate actual tip amount (amount - fee)
        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, from, amount, "");
        return amount - fee;
    }

    function _sendLegacyTip(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 actualTipAmount) {
        // User sends the full amount, fee is deducted internally
        vm.deal(from, amount);

        ITippingBase.TipRequest memory request = ITippingBase.TipRequest({
            receiver: to,
            tokenId: 1,
            currency: CurrencyTransfer.NATIVE_TOKEN,
            amount: amount,
            messageId: bytes32(uint256(1)),
            channelId: bytes32(uint256(2))
        });

        vm.prank(from);
        tipping.tip{value: amount}(request);

        // Calculate actual tip amount (amount - fee)
        uint256 fee = feeManager.calculateFee(FeeTypes.TIP_MEMBER, from, amount, "");
        return amount - fee;
    }

    function _sendBotTip(address from, address to, uint256 amount) internal {
        vm.deal(from, amount);

        ITippingBase.BotTipParams memory params = ITippingBase.BotTipParams({
            receiver: to,
            currency: CurrencyTransfer.NATIVE_TOKEN,
            appId: bytes32(0),
            amount: amount,
            metadata: ITippingBase.TipMetadata({
                messageId: bytes32(uint256(1)),
                channelId: bytes32(uint256(2)),
                data: ""
            })
        });

        vm.prank(from);
        tipping.sendTip{value: amount}(ITippingBase.TipRecipientType.Bot, abi.encode(params));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TEST MODIFIERS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier givenStakingHookConfigured() {
        _configureStakingHook();
        _;
    }
}
