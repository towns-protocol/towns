// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";
import {ITipping, ITippingBase} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import {FeeCalculationMethod} from "src/factory/facets/fee/FeeManagerStorage.sol";
import {FeeTypesLib} from "src/factory/facets/fee/FeeTypesLib.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {StakingExemptionHook} from "test/factory/fee/mocks/hooks/StakingExemptionHook.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

/// @title TippingFeeIntegrationBaseTest
/// @notice Base test contract with setup and helper functions for tipping integration tests
abstract contract TippingFeeIntegrationBaseTest is BaseSetup {
    IFeeManager internal feeManager;
    ITipping internal tipping;
    StakingExemptionHook internal stakingHook;
    MockERC20 internal mockUSDC;

    address internal tipper;
    address internal tipReceiver;
    address internal feeRecipient;

    uint256 internal constant TIP_AMOUNT = 1 ether;
    uint256 internal constant EXPECTED_FEE = 0.005 ether; // 0.5% of 1 ether
    uint256 internal constant STAKING_EXEMPTION_THRESHOLD = 1000 ether;

    // ERC20 constants (using 18 decimals)
    uint256 internal constant ERC20_TIP_AMOUNT = 1000 ether; // 1000 tokens
    uint256 internal constant ERC20_EXPECTED_FEE = 5 ether; // 5 tokens (0.5%)

    function setUp() public virtual override {
        super.setUp();

        feeManager = IFeeManager(spaceFactory);
        tipping = ITipping(everyoneSpace);
        feeRecipient = deployer;

        tipper = _randomAddress();
        tipReceiver = _randomAddress();

        // Deploy mock USDC token (6 decimals)
        mockUSDC = new MockERC20("USD Coin", "USDC", 6);

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
            FeeTypesLib.TIP_MEMBER,
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
        stakingHook.setExemptionThreshold(FeeTypesLib.TIP_MEMBER, STAKING_EXEMPTION_THRESHOLD);
        feeManager.setFeeHook(FeeTypesLib.TIP_MEMBER, address(stakingHook));
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
        uint256 fee = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, from, amount, "");
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
        uint256 fee = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, from, amount, "");
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
    /*                   ERC20 TIPPING HELPERS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _sendMemberTipERC20(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 actualTipAmount) {
        // Mint and approve tokens
        mockUSDC.mint(from, amount);
        vm.prank(from);
        mockUSDC.approve(address(tipping), amount);

        ITippingBase.MembershipTipParams memory params = ITippingBase.MembershipTipParams({
            receiver: to,
            tokenId: 1,
            currency: address(mockUSDC),
            amount: amount,
            metadata: ITippingBase.TipMetadata({
                messageId: bytes32(uint256(1)),
                channelId: bytes32(uint256(2)),
                data: ""
            })
        });

        vm.prank(from);
        tipping.sendTip(ITippingBase.TipRecipientType.Member, abi.encode(params));

        // Calculate actual tip amount (amount - fee)
        uint256 fee = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, from, amount, "");
        return amount - fee;
    }

    function _sendLegacyTipERC20(
        address from,
        address to,
        uint256 amount
    ) internal returns (uint256 actualTipAmount) {
        // Mint and approve tokens
        mockUSDC.mint(from, amount);
        vm.prank(from);
        mockUSDC.approve(address(tipping), amount);

        ITippingBase.TipRequest memory request = ITippingBase.TipRequest({
            receiver: to,
            tokenId: 1,
            currency: address(mockUSDC),
            amount: amount,
            messageId: bytes32(uint256(1)),
            channelId: bytes32(uint256(2))
        });

        vm.prank(from);
        tipping.tip(request);

        // Calculate actual tip amount (amount - fee)
        uint256 fee = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, from, amount, "");
        return amount - fee;
    }

    function _sendBotTipERC20(address from, address to, uint256 amount) internal {
        // Mint and approve tokens
        mockUSDC.mint(from, amount);
        vm.prank(from);
        mockUSDC.approve(address(tipping), amount);

        ITippingBase.BotTipParams memory params = ITippingBase.BotTipParams({
            receiver: to,
            currency: address(mockUSDC),
            appId: bytes32(0),
            amount: amount,
            metadata: ITippingBase.TipMetadata({
                messageId: bytes32(uint256(1)),
                channelId: bytes32(uint256(2)),
                data: ""
            })
        });

        vm.prank(from);
        tipping.sendTip(ITippingBase.TipRecipientType.Bot, abi.encode(params));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TEST MODIFIERS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier givenStakingHookConfigured() {
        _configureStakingHook();
        _;
    }
}
