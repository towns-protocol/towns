// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITippingBase} from "../../../spaces/facets/tipping/ITipping.sol";
import {IFeeManager} from "../../../factory/facets/fee/IFeeManager.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {FeeTypesLib} from "../../../factory/facets/fee/FeeTypesLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                         TYPES                            */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
using CustomRevert for bytes4;
using EnumerableSetLib for EnumerableSetLib.AddressSet;

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                          STORAGE                           */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

// keccak256(abi.encode(uint256(keccak256("towns.account.tipping.mod.storage")) - 1)) & ~bytes32(uint256(0xff))
bytes32 constant STORAGE_SLOT = 0x2a95e0ca73c50924d5ddd84672da871cae538509d7dabaedae2f730a19f18300;
uint256 constant MAX_FEE_TOLERANCE = 100; // 1% tolerance

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

/// @notice Returns the address of the contract using this module
function getSelf() view returns (address self) {
    assembly {
        self := address()
    }
}

/// @notice Returns the storage layout for the AccountTippingMod
function getStorage() pure returns (Layout storage $) {
    assembly {
        $.slot := STORAGE_SLOT
    }
}

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                         FUNCTIONS                          */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/// @notice Sends a tip
/// @param recipientType The type of recipient
/// @param data The data for the tip
/// @return tipAmount The amount of the tip
/// @return protocolFee The protocol fee
function tipAny(
    address self,
    uint8 recipientType,
    bytes calldata data
) returns (uint256 tipAmount, uint256 protocolFee) {
    if (recipientType != uint8(ITippingBase.TipRecipientType.Any))
        ITippingBase.InvalidRecipientType.selector.revertWith();

    ITippingBase.AnyTipParams memory request = abi.decode(data, (ITippingBase.AnyTipParams));

    protocolFee;
    tipAmount = request.amount;

    validateTip(request.sender, request.receiver, request.currency, request.amount);
    depositTip(self, request.currency, request.amount);
    processTip(getStorage(), self, request.receiver, request.currency, request.amount);

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
/// @param self The address of the facet
/// @param receiver The address of the recipient
/// @param currency The currency of the tip
/// @param amount The amount of the tip
function processTip(
    Layout storage $,
    address self,
    address receiver,
    address currency,
    uint256 amount
) {
    // Add currency to set
    $.currencies.add(currency);

    // Update global currency stats
    Stats storage stats = $.currencyStats[currency];
    stats.amount += amount;
    stats.total += 1;

    // Update account-specific stats
    Stats storage accountStats = $.accountStats[receiver];
    accountStats.amount += amount;
    accountStats.total += 1;

    Stats storage accountStatsByCurrency = $.accountStatsByCurrency[receiver][currency];
    accountStatsByCurrency.amount += amount;
    accountStatsByCurrency.total += 1;

    // Transfer currency
    CurrencyTransfer.transferCurrency(currency, self, receiver, amount);
}

/// @notice Handles the protocol fee
/// @param spaceFactory The address of the space factory
/// @param currency The currency of the tip
/// @param amount The amount of the tip
/// @return protocolFee The protocol fee
function handleProtocolFee(
    address spaceFactory,
    address currency,
    uint256 amount
) returns (uint256 protocolFee) {
    uint256 expectedFee = IFeeManager(spaceFactory).calculateFee(
        FeeTypesLib.TIP_MEMBER,
        msg.sender,
        amount,
        ""
    );

    if (expectedFee == 0) return 0;

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
    if (!isNative) SafeTransferLib.safeApprove(currency, spaceFactory, 0);
}

/// @notice Validates a tip
/// @param sender The address of the sender
/// @param receiver The address of the recipient
/// @param currency The currency of the tip
/// @param amount The amount of the tip
function validateTip(address sender, address receiver, address currency, uint256 amount) view {
    if (currency == address(0)) ITippingBase.CurrencyIsZero.selector.revertWith();
    if (amount == 0) ITippingBase.AmountIsZero.selector.revertWith();
    if (sender != msg.sender) ITippingBase.NotSenderOfTip.selector.revertWith();
    if (sender == receiver) ITippingBase.CannotTipSelf.selector.revertWith();
}

/// @notice Deposits a tip
/// @param self The address of the facet
/// @param currency The currency of the tip
/// @param amount The amount of the tip
function depositTip(address self, address currency, uint256 amount) {
    if (currency == CurrencyTransfer.NATIVE_TOKEN) {
        if (msg.value != amount) ITippingBase.MsgValueMismatch.selector.revertWith();
    } else {
        if (msg.value != 0) ITippingBase.UnexpectedETH.selector.revertWith();
        CurrencyTransfer.transferCurrency(currency, msg.sender, self, amount);
    }
}
