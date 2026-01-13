// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITippingBase} from "./ITipping.sol";
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";
import {IFeeManager} from "../../../factory/facets/fee/IFeeManager.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {FeeTypesLib} from "../../../factory/facets/fee/FeeTypesLib.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {ProtocolFeeLib} from "../ProtocolFeeLib.sol";
import {TippingStorage} from "./TippingStorage.sol";

// contracts
import {PointsBase} from "../points/PointsBase.sol";

abstract contract TippingBase is ITippingBase, PointsBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for bytes4;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Internal Functions                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Handles member tips: validate, transfer, fee, process, emit events
    function _sendMemberTip(
        address receiver,
        uint256 tokenId,
        address currency,
        uint256 amount,
        bytes32 messageId,
        bytes32 channelId,
        bytes memory eventData
    ) internal {
        _validateTipRequest(msg.sender, receiver, currency, amount);
        _validateAndTransferPayment(currency, amount);

        uint256 protocolFee = _handleProtocolFee(currency, amount);
        uint256 tipAmount = amount - protocolFee;

        _processTip(receiver, tokenId, TipRecipientType.Member, currency, tipAmount);

        // legacy event uses raw amount for backwards compatibility
        emit Tip(tokenId, currency, msg.sender, receiver, amount, messageId, channelId);

        emit TipSent(msg.sender, receiver, TipRecipientType.Member, currency, tipAmount, eventData);
    }

    /// @dev Handles bot tips (no protocol fees charged)
    function _sendBotTip(
        address receiver,
        address currency,
        uint256 amount,
        bytes calldata eventData
    ) internal {
        _validateTipRequest(msg.sender, receiver, currency, amount);
        _validateAndTransferPayment(currency, amount);

        _processTip(receiver, 0, TipRecipientType.Bot, currency, amount);

        emit TipSent(msg.sender, receiver, TipRecipientType.Bot, currency, amount, eventData);
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

        $.currencies.add(currency);

        // Update stats by currency
        TippingStorage.TippingStats storage stats = $.tippingStatsByCurrency[currency];
        stats.tipAmount += amount;
        stats.totalTips += 1;

        // Update wallet-based tracking (all tips)
        TippingStorage.TippingStats storage walletStats = _getWalletStats(receiver, currency);
        walletStats.tipAmount += amount;
        walletStats.totalTips += 1;

        // Update tokenId-based tracking (backwards compatibility, only for Member tips)
        if (recipientType == TipRecipientType.Member) {
            $.tipsByCurrencyByTokenId[tokenId][currency] += amount;
        }

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
        address currency,
        uint256 amount
    ) internal returns (uint256 protocolFee) {
        address spaceFactory = MembershipStorage.layout().spaceFactory;

        // Calculate fee first
        protocolFee = IFeeManager(spaceFactory).calculateFee(
            FeeTypesLib.TIP_MEMBER,
            msg.sender,
            amount,
            ""
        );

        // Charge with pre-calculated fee
        protocolFee = ProtocolFeeLib.charge(
            spaceFactory,
            FeeTypesLib.TIP_MEMBER,
            msg.sender,
            currency,
            amount,
            protocolFee
        );

        // Mint points for fee payment (only for ETH tips)
        if (protocolFee > 0 && currency == CurrencyTransfer.NATIVE_TOKEN) {
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

    function _getWalletStats(
        address wallet,
        address currency
    ) internal view returns (TippingStorage.TippingStats storage) {
        return TippingStorage.layout().tippingStatsByCurrencyByWallet[wallet][currency];
    }

    function _getTipsByWallet(address wallet, address currency) internal view returns (uint256) {
        return _getWalletStats(wallet, currency).tipAmount;
    }

    function _getTipCountByWallet(
        address wallet,
        address currency
    ) internal view returns (uint256) {
        return _getWalletStats(wallet, currency).totalTips;
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
