// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ITownsPoints} from "src/airdrop/points/ITownsPoints.sol";
import {IERC721ABase} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ITippingBase} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {IntrospectionFacet} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {Test} from "forge-std/Test.sol";
import {MembershipFacet} from "src/spaces/facets/membership/MembershipFacet.sol";
import {TippingFacet} from "src/spaces/facets/tipping/TippingFacet.sol";
import {DeployMockERC20, MockERC20} from "scripts/deployments/utils/DeployMockERC20.s.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

contract TippingTest is Test, BaseSetup, ITippingBase, IERC721ABase {
    // Default test parameters
    bytes32 internal constant DEFAULT_MESSAGE_ID = bytes32(uint256(0x1));
    bytes32 internal constant DEFAULT_CHANNEL_ID = bytes32(uint256(0x2));

    DeployMockERC20 internal deployERC20 = new DeployMockERC20();

    TippingFacet internal tipping;
    IntrospectionFacet internal introspection;
    MembershipFacet internal membership;
    IERC721AQueryable internal token;
    MockERC20 internal mockERC20;
    ITownsPoints internal points;

    address internal platformRecipient;

    function setUp() public override {
        super.setUp();

        tipping = TippingFacet(everyoneSpace);
        introspection = IntrospectionFacet(everyoneSpace);
        membership = MembershipFacet(everyoneSpace);
        token = IERC721AQueryable(everyoneSpace);
        mockERC20 = MockERC20(deployERC20.deploy(deployer));
        points = ITownsPoints(riverAirdrop);
        platformRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();
    }

    modifier givenUsersAreMembers(address sender, address receiver) {
        vm.assume(sender != receiver);
        assumeUnusedAddress(sender);
        assumeUnusedAddress(receiver);

        vm.prank(sender);
        membership.joinSpace(sender);

        vm.prank(receiver);
        membership.joinSpace(receiver);
        _;
    }

    function test_tipEth(
        address sender,
        address receiver,
        uint256 amount,
        bytes32 messageId,
        bytes32 channelId
    ) external givenUsersAreMembers(sender, receiver) {
        vm.assume(sender != platformRecipient);
        vm.assume(receiver != platformRecipient);
        amount = bound(amount, 1, type(uint256).max / BasisPoints.MAX_BPS);

        uint256 initialBalance = receiver.balance;
        uint256 initialPointBalance = IERC20(address(points)).balanceOf(sender);
        uint256 tokenId = token.tokensOfOwner(receiver)[0];

        uint256 protocolFee = BasisPoints.calculate(amount, 50); // 0.5%
        uint256 tipAmount = amount - protocolFee;

        hoax(sender, amount);
        vm.expectEmit(address(tipping));
        emit Tip(
            tokenId,
            CurrencyTransfer.NATIVE_TOKEN,
            sender,
            receiver,
            amount,
            messageId,
            channelId
        );
        vm.startSnapshotGas("tipEth");
        tipping.tip{value: amount}(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: CurrencyTransfer.NATIVE_TOKEN,
                amount: amount,
                messageId: messageId,
                channelId: channelId
            })
        );

        assertLt(vm.stopSnapshotGas(), 400_000);
        assertEq(receiver.balance - initialBalance, tipAmount, "receiver balance");
        assertEq(platformRecipient.balance, protocolFee, "protocol fee");
        assertEq(sender.balance, 0, "sender balance");
        assertEq(
            IERC20(address(points)).balanceOf(sender) - initialPointBalance,
            (protocolFee * 2_000_000) / 3,
            "points minted"
        );
        assertEq(
            tipping.tipsByCurrencyAndTokenId(tokenId, CurrencyTransfer.NATIVE_TOKEN),
            tipAmount
        );
        assertEq(tipping.totalTipsByCurrency(CurrencyTransfer.NATIVE_TOKEN), 1);
        assertEq(tipping.tipAmountByCurrency(CurrencyTransfer.NATIVE_TOKEN), tipAmount);
        assertContains(tipping.tippingCurrencies(), CurrencyTransfer.NATIVE_TOKEN);
    }

    function test_tipERC20(
        address sender,
        address receiver,
        uint256 amount,
        bytes32 messageId,
        bytes32 channelId
    ) external givenUsersAreMembers(sender, receiver) {
        vm.assume(amount != 0);

        uint256[] memory tokens = token.tokensOfOwner(receiver);
        uint256 tokenId = tokens[0];

        mockERC20.mint(sender, amount);

        vm.startPrank(sender);
        mockERC20.approve(address(tipping), amount);
        vm.expectEmit(address(tipping));
        emit Tip(tokenId, address(mockERC20), sender, receiver, amount, messageId, channelId);
        vm.startSnapshotGas("tipERC20");
        tipping.tip(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: address(mockERC20),
                amount: amount,
                messageId: messageId,
                channelId: channelId
            })
        );
        uint256 gasUsed = vm.stopSnapshotGas();
        vm.stopPrank();

        assertLt(gasUsed, 300_000);
        assertEq(mockERC20.balanceOf(sender), 0);
        assertEq(mockERC20.balanceOf(receiver), amount);
        assertEq(tipping.tipsByCurrencyAndTokenId(tokenId, address(mockERC20)), amount);
        assertEq(tipping.totalTipsByCurrency(address(mockERC20)), 1);
        assertEq(tipping.tipAmountByCurrency(address(mockERC20)), amount);
        assertContains(tipping.tippingCurrencies(), address(mockERC20));
    }

    function test_tip_revertWhen_currencyIsZero(
        address sender,
        address receiver
    ) external givenUsersAreMembers(sender, receiver) {
        uint256 tokenId = token.tokensOfOwner(receiver)[0];

        vm.expectRevert(CurrencyIsZero.selector);
        tipping.tip(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: address(0),
                amount: 1,
                messageId: DEFAULT_MESSAGE_ID,
                channelId: DEFAULT_CHANNEL_ID
            })
        );
    }

    function test_tip_revertWhen_cannotTipSelf(
        address sender,
        address receiver
    ) external givenUsersAreMembers(sender, receiver) {
        uint256 tokenId = token.tokensOfOwner(sender)[0];

        vm.prank(sender);
        vm.expectRevert(CannotTipSelf.selector);
        tipping.tip(
            TipRequest({
                receiver: sender,
                tokenId: tokenId,
                currency: CurrencyTransfer.NATIVE_TOKEN,
                amount: 1,
                messageId: DEFAULT_MESSAGE_ID,
                channelId: DEFAULT_CHANNEL_ID
            })
        );
    }

    function test_tip_revertWhen_amountIsZero(
        address sender,
        address receiver
    ) external givenUsersAreMembers(sender, receiver) {
        uint256 tokenId = token.tokensOfOwner(receiver)[0];

        vm.expectRevert(AmountIsZero.selector);
        vm.prank(sender);
        tipping.tip(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: CurrencyTransfer.NATIVE_TOKEN,
                amount: 0,
                messageId: DEFAULT_MESSAGE_ID,
                channelId: DEFAULT_CHANNEL_ID
            })
        );
    }

    function test_tip_revertWhen_msgValueMismatch(
        address sender,
        address receiver,
        uint256 amount,
        uint256 value
    ) external givenUsersAreMembers(sender, receiver) {
        vm.assume(amount != 0);
        vm.assume(amount != value);
        uint256 tokenId = token.tokensOfOwner(receiver)[0];

        vm.expectRevert(MsgValueMismatch.selector);
        hoax(sender, value);
        tipping.tip{value: value}(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: CurrencyTransfer.NATIVE_TOKEN,
                amount: amount,
                messageId: DEFAULT_MESSAGE_ID,
                channelId: DEFAULT_CHANNEL_ID
            })
        );
    }

    function test_tip_revertWhen_unexpectedETHSent(
        address sender,
        address receiver,
        uint256 amount,
        uint256 value
    ) external givenUsersAreMembers(sender, receiver) {
        vm.assume(amount != 0);
        vm.assume(value != 0);
        uint256 tokenId = token.tokensOfOwner(receiver)[0];

        mockERC20.mint(sender, amount);

        deal(sender, value);
        vm.startPrank(sender);
        mockERC20.approve(address(tipping), amount);

        vm.expectRevert(UnexpectedETH.selector);
        tipping.tip{value: value}(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: address(mockERC20),
                amount: amount,
                messageId: DEFAULT_MESSAGE_ID,
                channelId: DEFAULT_CHANNEL_ID
            })
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    New sendTip Tests                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendTip_memberWithEth(
        address sender,
        address receiver,
        uint256 amount
    ) external givenUsersAreMembers(sender, receiver) {
        vm.assume(sender != platformRecipient);
        vm.assume(receiver != platformRecipient);
        amount = bound(amount, 1, type(uint256).max / BasisPoints.MAX_BPS);

        uint256 initialBalance = receiver.balance;
        uint256 initialPointBalance = IERC20(address(points)).balanceOf(sender);
        uint256 tokenId = token.tokensOfOwner(receiver)[0];
        uint256 protocolFee = BasisPoints.calculate(amount, 50); // 0.5%
        uint256 tipAmount;
        unchecked {
            tipAmount = amount - protocolFee;
        }

        hoax(sender, amount);
        vm.startSnapshotGas("sendTip_member_eth");
        tipping.sendTip{value: amount}(
            TipRecipientType.Member,
            abi.encode(
                MembershipTipParams({
                    receiver: receiver,
                    tokenId: tokenId,
                    currency: CurrencyTransfer.NATIVE_TOKEN,
                    amount: amount,
                    metadata: TipMetadata({messageId: bytes32(0), channelId: bytes32(0), data: ""})
                })
            )
        );
        assertLt(vm.stopSnapshotGas(), 400_000);

        assertEq(receiver.balance - initialBalance, tipAmount, "receiver balance");
        assertEq(platformRecipient.balance, protocolFee, "protocol fee");
        assertEq(sender.balance, 0, "sender balance");
        assertEq(
            IERC20(address(points)).balanceOf(sender) - initialPointBalance,
            (protocolFee * 2_000_000) / 3,
            "points minted"
        );
        assertEq(
            tipping.tipsByCurrencyAndTokenId(tokenId, CurrencyTransfer.NATIVE_TOKEN),
            tipAmount
        );
        assertEq(
            tipping.tipsByWalletAndCurrency(receiver, CurrencyTransfer.NATIVE_TOKEN),
            tipAmount
        );
        assertEq(tipping.tipCountByWalletAndCurrency(receiver, CurrencyTransfer.NATIVE_TOKEN), 1);
        assertEq(tipping.totalTipsByCurrency(CurrencyTransfer.NATIVE_TOKEN), 1);
        assertEq(tipping.tipAmountByCurrency(CurrencyTransfer.NATIVE_TOKEN), tipAmount);
    }

    function test_sendTip_botWithEth(address sender, address botAddress, uint256 amount) external {
        vm.assume(sender != address(0));
        vm.assume(botAddress != address(0));
        vm.assume(sender != botAddress);
        assumeUnusedAddress(sender);
        assumeUnusedAddress(botAddress);
        amount = bound(amount, 1, type(uint256).max);

        uint256 initialBalance = botAddress.balance;

        hoax(sender, amount);
        vm.startSnapshotGas("sendTip_bot_eth");
        tipping.sendTip{value: amount}(
            TipRecipientType.Bot,
            abi.encode(
                BotTipParams({
                    receiver: botAddress,
                    currency: CurrencyTransfer.NATIVE_TOKEN,
                    appId: bytes32(0),
                    amount: amount,
                    metadata: TipMetadata({messageId: bytes32(0), channelId: bytes32(0), data: ""})
                })
            )
        );
        assertLt(vm.stopSnapshotGas(), 300_000);

        assertEq(botAddress.balance - initialBalance, amount, "bot balance");
        assertEq(sender.balance, 0, "sender balance");
        assertEq(
            tipping.tipsByWalletAndCurrency(botAddress, CurrencyTransfer.NATIVE_TOKEN),
            amount
        );
        assertEq(tipping.tipCountByWalletAndCurrency(botAddress, CurrencyTransfer.NATIVE_TOKEN), 1);
        assertEq(tipping.totalTipsByCurrency(CurrencyTransfer.NATIVE_TOKEN), 1);
        assertEq(tipping.tipAmountByCurrency(CurrencyTransfer.NATIVE_TOKEN), amount);
    }

    function test_sendTip_revertWhen_invalidRecipientType(
        address sender,
        address receiver,
        uint256 amount
    ) external {
        vm.assume(sender != address(0));
        vm.assume(receiver != address(0));
        vm.assume(sender != receiver);
        amount = bound(amount, 1, type(uint256).max);

        BotTipParams memory params = BotTipParams({
            receiver: receiver,
            currency: CurrencyTransfer.NATIVE_TOKEN,
            appId: bytes32(0),
            amount: amount,
            metadata: TipMetadata({messageId: bytes32(0), channelId: bytes32(0), data: ""})
        });

        hoax(sender, amount);
        vm.expectRevert(InvalidRecipientType.selector);
        tipping.sendTip{value: amount}(TipRecipientType.Pool, abi.encode(params));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              Backwards Compatibility Tests                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_backwardsCompatibility_legacyTipEmitsBothEvents(
        address sender,
        address receiver,
        uint256 amount
    ) external givenUsersAreMembers(sender, receiver) {
        vm.assume(sender != platformRecipient);
        vm.assume(receiver != platformRecipient);
        amount = bound(amount, 1, type(uint256).max / BasisPoints.MAX_BPS);

        uint256 tokenId = token.tokensOfOwner(receiver)[0];
        uint256 protocolFee = BasisPoints.calculate(amount, 50);
        uint256 tipAmount = amount - protocolFee;

        hoax(sender, amount);
        vm.expectEmit(address(tipping));
        emit Tip(
            tokenId,
            CurrencyTransfer.NATIVE_TOKEN,
            sender,
            receiver,
            amount,
            DEFAULT_MESSAGE_ID,
            DEFAULT_CHANNEL_ID
        );
        vm.expectEmit(address(tipping));
        emit TipSent(
            sender,
            receiver,
            TipRecipientType.Member,
            CurrencyTransfer.NATIVE_TOKEN,
            tipAmount,
            tokenId
        );
        tipping.tip{value: amount}(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: CurrencyTransfer.NATIVE_TOKEN,
                amount: amount,
                messageId: DEFAULT_MESSAGE_ID,
                channelId: DEFAULT_CHANNEL_ID
            })
        );
    }

    function test_backwardsCompatibility_legacyDataAccessible(
        address sender,
        address receiver,
        uint256 amount
    ) external givenUsersAreMembers(sender, receiver) {
        vm.assume(sender != platformRecipient);
        vm.assume(receiver != platformRecipient);
        amount = bound(amount, 1, type(uint256).max / BasisPoints.MAX_BPS);

        uint256 tokenId = token.tokensOfOwner(receiver)[0];
        uint256 protocolFee = BasisPoints.calculate(amount, 50);
        uint256 tipAmount = amount - protocolFee;

        hoax(sender, amount);
        tipping.tip{value: amount}(
            TipRequest({
                receiver: receiver,
                tokenId: tokenId,
                currency: CurrencyTransfer.NATIVE_TOKEN,
                amount: amount,
                messageId: DEFAULT_MESSAGE_ID,
                channelId: DEFAULT_CHANNEL_ID
            })
        );

        // Legacy view functions work
        assertEq(
            tipping.tipsByCurrencyAndTokenId(tokenId, CurrencyTransfer.NATIVE_TOKEN),
            tipAmount
        );
        // New view functions also work
        assertEq(
            tipping.tipsByWalletAndCurrency(receiver, CurrencyTransfer.NATIVE_TOKEN),
            tipAmount
        );
        assertEq(tipping.tipCountByWalletAndCurrency(receiver, CurrencyTransfer.NATIVE_TOKEN), 1);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Helper Functions                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function assertContains(address[] memory arr, address value) internal pure override {
        for (uint256 i; i < arr.length; ++i) {
            if (arr[i] == value) return;
        }
        revert("Value not found in array");
    }
}
