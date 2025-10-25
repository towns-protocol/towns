// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITippingBase} from "./ITipping.sol";
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";
import {IFeeManager} from "../../../factory/facets/fee/IFeeManager.sol";
import {FeeTypesLib} from "../../../factory/facets/fee/libraries/FeeTypesLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {TippingStorage} from "./TippingStorage.sol";

// contracts
import {PointsBase} from "../points/PointsBase.sol";

abstract contract TippingBase is ITippingBase, PointsBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for bytes4;

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

        uint256 tipAmount = tipRequest.amount;

        // Handle native token
        if (tipRequest.currency == CurrencyTransfer.NATIVE_TOKEN) {
            if (msg.value != tipAmount) MsgValueMismatch.selector.revertWith();
            uint256 protocolFee = _handleProtocolFee(tipAmount, tipRequest.currency);
            tipAmount -= protocolFee;
        } else {
            // Handle ERC20 token
            if (msg.value != 0) UnexpectedETH.selector.revertWith();

            // Pull tokens from user to Space
            CurrencyTransfer.transferCurrency(
                tipRequest.currency,
                msg.sender,
                address(this),
                tipAmount
            );

            // Charge protocol fee (FeeManager pulls from Space)
            uint256 protocolFee = _handleProtocolFee(tipAmount, tipRequest.currency);
            tipAmount -= protocolFee;
        }

        // Process tip
        _processTip(
            msg.sender,
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

        uint256 tipAmount = params.amount;

        // Handle native token
        if (params.currency == CurrencyTransfer.NATIVE_TOKEN) {
            if (msg.value != tipAmount) MsgValueMismatch.selector.revertWith();
            uint256 protocolFee = _handleProtocolFee(tipAmount, params.currency);
            tipAmount -= protocolFee;
        } else {
            // Handle ERC20 token
            if (msg.value != 0) UnexpectedETH.selector.revertWith();

            // Pull tokens from user to Space
            CurrencyTransfer.transferCurrency(
                params.currency,
                msg.sender,
                address(this),
                tipAmount
            );

            // Charge protocol fee (FeeManager pulls from Space)
            uint256 protocolFee = _handleProtocolFee(tipAmount, params.currency);
            tipAmount -= protocolFee;
        }

        // Process tip
        _processTip(
            msg.sender,
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
            msg.sender,
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
        address sender,
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
        // For native token: transfer from sender (Space acts as intermediary with msg.value)
        // For ERC20: transfer from Space (Space pulled tokens earlier)
        address from = currency == CurrencyTransfer.NATIVE_TOKEN ? sender : address(this);
        CurrencyTransfer.transferCurrency(currency, from, receiver, amount);
    }

    /// @dev Handles protocol fee and points minting
    /// @param amount The tip amount to calculate fee on
    /// @param currency The currency of the tip (NATIVE_TOKEN or ERC20 address)
    /// @return protocolFee The fee amount charged
    function _handleProtocolFee(
        uint256 amount,
        address currency
    ) internal returns (uint256 protocolFee) {
        MembershipStorage.Layout storage ds = MembershipStorage.layout();
        address spaceFactory = ds.spaceFactory;

        // First calculate the fee amount
        protocolFee = IFeeManager(spaceFactory).calculateFee({
            feeType: FeeTypesLib.TIP_MEMBER,
            user: msg.sender,
            amount: amount,
            extraData: ""
        });

        // Charge fee using FeeManager
        if (protocolFee > 0) {
            // Convert NATIVE_TOKEN constant to address(0) for FeeManager
            address feeCurrency = currency == CurrencyTransfer.NATIVE_TOKEN ? address(0) : currency;

            if (currency == CurrencyTransfer.NATIVE_TOKEN) {
                // For native token, send ETH with the call
                IFeeManager(spaceFactory).chargeFee{value: protocolFee}({
                    feeType: FeeTypesLib.TIP_MEMBER,
                    user: msg.sender,
                    amount: amount,
                    currency: feeCurrency,
                    extraData: ""
                });
            } else {
                // For ERC20, approve FeeManager then call chargeFee
                // Space must have the tokens already (pulled from user)
                IERC20(currency).approve(spaceFactory, protocolFee);

                IFeeManager(spaceFactory).chargeFee({
                    feeType: FeeTypesLib.TIP_MEMBER,
                    user: msg.sender,
                    amount: amount,
                    currency: feeCurrency,
                    extraData: ""
                });

                // Reset approval to 0 for security
                IERC20(currency).approve(spaceFactory, 0);
            }

            // Mint points if fee was charged
            address airdropDiamond = _getAirdropDiamond();
            uint256 points = _getPoints(
                airdropDiamond,
                ITownsPointsBase.Action.Tip,
                abi.encode(protocolFee)
            );
            _mintPoints(airdropDiamond, msg.sender, points);
        }
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
