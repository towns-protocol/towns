// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITippingBase} from "../../../spaces/facets/tipping/ITipping.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";

library AccountTippingMod {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         TYPES                              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Stats for a currency
    /// @param total The total number of tips
    /// @param amount The total amount of tips
    struct Stats {
        uint256 total;
        uint256 amount;
    }

    /// @notice Storage layout for the AccountTippingMod
    /// @custom:storage-location erc7201:towns.account.tipping.mod.storage
    struct Layout {
        // Global mappings
        EnumerableSetLib.AddressSet currencies;
        mapping(address currency => Stats stats) currencyStats;
        mapping(address account => Stats stats) accountStats;
        mapping(address account => mapping(address currency => Stats stats)) accountStatsByCurrency;
    }

    // keccak256(abi.encode(uint256(keccak256("towns.account.tipping.mod.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x2a95e0ca73c50924d5ddd84672da871cae538509d7dabaedae2f730a19f18300;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Sends a tip
    /// @param recipientType The type of recipient
    /// @param data The data for the tip
    /// @return tipAmount The amount of the tip
    /// @return protocolFee The protocol fee
    function tipAny(
        Layout storage $,
        address self,
        uint8 recipientType,
        bytes calldata data
    ) internal returns (uint256 tipAmount, uint256 protocolFee) {
        if (recipientType != uint8(ITippingBase.TipRecipientType.Any))
            ITippingBase.InvalidRecipientType.selector.revertWith();

        ITippingBase.AnyTipParams memory request = abi.decode(data, (ITippingBase.AnyTipParams));

        protocolFee;
        tipAmount = request.amount;

        validateTip(request.sender, request.receiver, request.currency, request.amount);
        depositTip(self, request.currency, request.amount);
        processTip($, self, request.receiver, request.currency, request.amount);

        emit ITippingBase.TipSent(
            msg.sender,
            request.receiver,
            ITippingBase.TipRecipientType.Any,
            request.currency,
            request.amount,
            request.data
        );
    }

    /// @notice Processes a tip
    /// @param $ The storage layout
    /// @param from The address of the sender
    /// @param receiver The address of the recipient
    /// @param currency The currency of the tip
    /// @param amount The amount of the tip
    function processTip(
        Layout storage $,
        address from,
        address receiver,
        address currency,
        uint256 amount
    ) internal {
        // Add currency to set
        $.currencies.add(currency);

        // Update global currency stats
        Stats storage stats = $.currencyStats[currency];
        stats.amount += amount;
        ++stats.total;

        // Update account-specific stats
        Stats storage accountStats = $.accountStats[receiver];
        accountStats.amount += amount;
        ++accountStats.total;

        Stats storage accountStatsByCurrency = $.accountStatsByCurrency[receiver][currency];
        accountStatsByCurrency.amount += amount;
        ++accountStatsByCurrency.total;

        // Transfer currency
        CurrencyTransfer.transferCurrency(currency, from, receiver, amount);
    }

    /// @notice Deposits a tip
    /// @param to The address to deposit the tip to
    /// @param currency The currency of the tip
    /// @param amount The amount of the tip
    function depositTip(address to, address currency, uint256 amount) internal {
        if (currency == CurrencyTransfer.NATIVE_TOKEN) {
            if (msg.value != amount) ITippingBase.MsgValueMismatch.selector.revertWith();
        } else {
            if (msg.value != 0) ITippingBase.UnexpectedETH.selector.revertWith();
            CurrencyTransfer.transferCurrency(currency, msg.sender, to, amount);
        }
    }

    /// @notice Validates a tip
    /// @param sender The address of the sender
    /// @param receiver The address of the recipient
    /// @param currency The currency of the tip
    /// @param amount The amount of the tip
    function validateTip(
        address sender,
        address receiver,
        address currency,
        uint256 amount
    ) internal view {
        if (currency == address(0)) ITippingBase.CurrencyIsZero.selector.revertWith();
        if (receiver == address(0)) ITippingBase.InvalidAddressInput.selector.revertWith();
        if (amount == 0) ITippingBase.AmountIsZero.selector.revertWith();
        if (sender != msg.sender) ITippingBase.NotSenderOfTip.selector.revertWith();
        if (sender == receiver) ITippingBase.CannotTipSelf.selector.revertWith();
    }

    /// @notice Returns the storage layout for the AccountTippingMod
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
