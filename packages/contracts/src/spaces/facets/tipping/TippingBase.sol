// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITippingBase} from "./ITipping.sol";
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";
import {IFeeManager} from "../../../factory/facets/fee/IFeeManager.sol";
import {FeeTypesLib} from "../../../factory/facets/fee/FeeTypesLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {TippingStorage} from "./TippingStorage.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {PointsBase} from "../points/PointsBase.sol";

abstract contract TippingBase is ITippingBase, PointsBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for bytes4;

    uint256 internal constant MAX_FEE_TOLERANCE = 100; // 1% tolerance

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Internal Functions                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Processes sendTip based on recipient type
    function _sendTip(TipRecipientType recipientType, bytes calldata data) internal {
        if (recipientType == TipRecipientType.Member) {
            _sendMemberTip(data);
        } else if (recipientType == TipRecipientType.Bot) {
            _sendBotTip(data);
        } else {
            InvalidRecipientType.selector.revertWith();
        }
    }

    /// @dev Processes legacy tip function
    function _tip(TipRequest calldata tipRequest) internal {
        _validateTipRequest(
            msg.sender,
            tipRequest.receiver,
            tipRequest.currency,
            tipRequest.amount
        );

        // Validate payment and transfer tokens to space
        _validateAndTransferPayment(tipRequest.currency, tipRequest.amount);

        // Charge protocol fee and calculate net tip amount
        uint256 protocolFee = _handleProtocolFee(tipRequest.amount, tipRequest.currency);
        uint256 tipAmount = tipRequest.amount - protocolFee;

        // Process tip
        _processTip(
            tipRequest.receiver,
            tipRequest.tokenId,
            TipRecipientType.Member,
            tipRequest.currency,
            tipAmount
        );

        // Emit legacy event (with original amount for backwards compatibility)
        emit Tip(
            tipRequest.tokenId,
            tipRequest.currency,
            msg.sender,
            tipRequest.receiver,
            tipRequest.amount,
            tipRequest.messageId,
            tipRequest.channelId
        );

        // Emit new event (with actual tip amount after fees)
        emit TipSent(
            msg.sender,
            tipRequest.receiver,
            TipRecipientType.Member,
            tipRequest.currency,
            tipAmount,
            abi.encode(tipRequest.tokenId)
        );
    }

    /// @dev Handles member tips
    function _sendMemberTip(bytes calldata data) internal {
        MembershipTipParams memory params = abi.decode(data, (MembershipTipParams));
        _validateTipRequest(msg.sender, params.receiver, params.currency, params.amount);

        // Validate payment and transfer tokens to space
        _validateAndTransferPayment(params.currency, params.amount);

        // Charge protocol fee and calculate net tip amount
        uint256 protocolFee = _handleProtocolFee(params.amount, params.currency);
        uint256 tipAmount = params.amount - protocolFee;

        // Process tip
        _processTip(
            params.receiver,
            params.tokenId,
            TipRecipientType.Member,
            params.currency,
            tipAmount
        );

        // Emit events
        emit TipSent(
            msg.sender,
            params.receiver,
            TipRecipientType.Member,
            params.currency,
            tipAmount,
            params.metadata.data
        );

        emit Tip(
            params.tokenId,
            params.currency,
            msg.sender,
            params.receiver,
            tipAmount,
            params.metadata.messageId,
            params.metadata.channelId
        );
    }

    /// @dev Handles bot tips
    function _sendBotTip(bytes calldata data) internal {
        BotTipParams memory params = abi.decode(data, (BotTipParams));
        _validateTipRequest(msg.sender, params.receiver, params.currency, params.amount);

        uint256 tipAmount = params.amount;

        // Handle native token (no protocol fee for bot tips)
        if (params.currency == CurrencyTransfer.NATIVE_TOKEN) {
            if (msg.value != tipAmount) MsgValueMismatch.selector.revertWith();
        } else {
            // Handle ERC20 token (no fee for bot tips, just transfer)
            if (msg.value != 0) UnexpectedETH.selector.revertWith();

            // Pull tokens from user to Space
            CurrencyTransfer.transferCurrency(
                params.currency,
                msg.sender,
                address(this),
                tipAmount
            );
        }

        // Process tip (tokenId = 0 for bot tips)
        _processTip(
            params.receiver,
            0, // No tokenId for bot tips
            TipRecipientType.Bot,
            params.currency,
            tipAmount
        );

        emit TipSent(
            msg.sender,
            params.receiver,
            TipRecipientType.Bot,
            params.currency,
            tipAmount,
            params.metadata.data
        );
    }

    /// @dev Core tip processing logic
    function _processTip(
        address receiver,
        uint256 tokenId,
        TipRecipientType recipientType,
        address currency,
        uint256 amount
    ) internal {
        TippingStorage.Layout storage $ = TippingStorage.layout();

        // Add currency to set
        $.currencies.add(currency);

        // Update stats by currency
        TippingStorage.TippingStats storage stats = $.tippingStatsByCurrency[currency];
        stats.tipAmount += amount;
        stats.totalTips += 1;

        // Update wallet-based tracking (all tips)
        $.tippingStatsByCurrencyByWallet[receiver][currency].tipAmount += amount;
        $.tippingStatsByCurrencyByWallet[receiver][currency].totalTips += 1;

        // Update tokenId-based tracking (backwards compatibility, only for Member tips)
        if (recipientType == TipRecipientType.Member) {
            $.tipsByCurrencyByTokenId[tokenId][currency] += amount;
        }

        // Transfer currency
        CurrencyTransfer.transferCurrency(currency, address(this), receiver, amount);
    }

    /// @dev Validates payment and transfers tokens to space contract
    /// @param currency The currency being tipped (NATIVE_TOKEN or ERC20)
    /// @param amount The amount being tipped
    function _validateAndTransferPayment(address currency, uint256 amount) internal {
        if (currency == CurrencyTransfer.NATIVE_TOKEN) {
            if (msg.value != amount) MsgValueMismatch.selector.revertWith();
        } else {
            if (msg.value != 0) UnexpectedETH.selector.revertWith();
            CurrencyTransfer.transferCurrency(currency, msg.sender, address(this), amount);
        }
    }

    /// @dev Handles protocol fee charging and points minting
    /// @param amount The tip amount to calculate fee on
    /// @param currency The currency of the tip (NATIVE_TOKEN or ERC20 address)
    /// @return protocolFee The fee amount charged
    function _handleProtocolFee(
        uint256 amount,
        address currency
    ) internal returns (uint256 protocolFee) {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();
        address spaceFactory = ds.spaceFactory;

        // Calculate expected fee
        uint256 expectedFee = IFeeManager(spaceFactory).calculateFee(
            FeeTypesLib.TIP_MEMBER,
            msg.sender,
            amount,
            ""
        );

        if (expectedFee == 0) return 0;

        // Add slippage tolerance (1%)
        uint256 maxFee = expectedFee + BasisPoints.calculate(expectedFee, MAX_FEE_TOLERANCE);

        // Approve ERC20 if needed (native token sends value with call)
        bool isNative = currency == CurrencyTransfer.NATIVE_TOKEN;
        if (!isNative) SafeTransferLib.safeApproveWithRetry(currency, spaceFactory, maxFee);

        // Charge fee (excess native token will be refunded)
        protocolFee = IFeeManager(spaceFactory).chargeFee{value: isNative ? maxFee : 0}(
            FeeTypesLib.TIP_MEMBER,
            msg.sender,
            amount,
            currency,
            maxFee,
            ""
        );

        // Reset ERC20 approval
        if (!isNative) {
            SafeTransferLib.safeApprove(currency, spaceFactory, 0);
        }

        // Mint points for fee payment
        address airdropDiamond = _getAirdropDiamond();
        uint256 points = _getPoints(
            airdropDiamond,
            ITownsPointsBase.Action.Tip,
            abi.encode(protocolFee)
        );
        _mintPoints(airdropDiamond, msg.sender, points);
    }

    /// @dev Validates common tip requirements
    function _validateTipRequest(
        address sender,
        address receiver,
        address currency,
        uint256 amount
    ) internal pure {
        if (currency == address(0)) CurrencyIsZero.selector.revertWith();
        if (sender == receiver) CannotTipSelf.selector.revertWith();
        if (amount == 0) AmountIsZero.selector.revertWith();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Internal View Functions               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getTipsByWallet(address wallet, address currency) internal view returns (uint256) {
        return TippingStorage.layout().tippingStatsByCurrencyByWallet[wallet][currency].tipAmount;
    }

    function _getTipCountByWallet(
        address wallet,
        address currency
    ) internal view returns (uint256) {
        return TippingStorage.layout().tippingStatsByCurrencyByWallet[wallet][currency].totalTips;
    }

    function _getTipsByTokenId(uint256 tokenId, address currency) internal view returns (uint256) {
        return TippingStorage.layout().tipsByCurrencyByTokenId[tokenId][currency];
    }

    function _getTippingCurrencies() internal view returns (address[] memory) {
        return TippingStorage.layout().currencies.values();
    }

    function _getTotalTipsByCurrency(address currency) internal view returns (uint256) {
        return TippingStorage.layout().tippingStatsByCurrency[currency].totalTips;
    }

    function _getTipAmountByCurrency(address currency) internal view returns (uint256) {
        return TippingStorage.layout().tippingStatsByCurrency[currency].tipAmount;
    }
}
