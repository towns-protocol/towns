// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeeManager} from "../../../factory/facets/fee/IFeeManager.sol";
import {FeeTypesLib} from "../../../factory/facets/fee/FeeTypesLib.sol";
import {ITippingBase} from "./ITipping.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {MembershipStorage} from "../membership/MembershipStorage.sol";
import {BasisPoints} from "../../../utils/libraries/BasisPoints.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// declarations
using CustomRevert for bytes4;
using EnumerableSet for EnumerableSet.AddressSet;

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                           ERRORS                           */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

error InvalidRecipientType();
error InvalidTipData();
error TokenDoesNotExist();
error ReceiverIsNotMember();
error CannotTipSelf();
error AmountIsZero();
error CurrencyIsZero();
error MsgValueMismatch();
error UnexpectedETH();

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                         TYPES                              */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

uint256 constant MAX_FEE_TOLERANCE = 100; // 1% tolerance

enum TipRecipientType {
    Member, // Tips to token holders
    Bot, // Tips to bot wallets
    Pool // Tips to pool wallets
}

struct TipMetadata {
    bytes32 messageId;
    bytes32 channelId;
    bytes data; // Extensible metadata
}

/// @notice Params for Member tips (includes tokenId)
struct MembershipTipParams {
    address receiver;
    uint256 tokenId;
    address currency;
    uint256 amount;
    TipMetadata metadata;
}

/// @notice Params for Bot tips (similar to Wallet but distinct type)
struct BotTipParams {
    address receiver;
    address currency;
    bytes32 appId;
    uint256 amount;
    TipMetadata metadata;
}

/// @notice Legacy tip request (maintain backwards compatibility)
/// @custom:deprecated Use either MembershipTipParams or BotTipParams instead
struct TipRequest {
    address receiver;
    uint256 tokenId;
    address currency;
    uint256 amount;
    bytes32 messageId;
    bytes32 channelId;
}

struct TippingStats {
    uint256 totalTips;
    uint256 tipAmount;
}

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                           STORAGE                          */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

// keccak256(abi.encode(uint256(keccak256("spaces.facets.tipping.storage")) - 1)) & ~bytes32(uint256(0xff))
bytes32 constant STORAGE_SLOT = 0xb6cb334a9eea0cca2581db4520b45ac6f03de8e3927292302206bb82168be300;

struct Layout {
    EnumerableSet.AddressSet currencies;
    mapping(uint256 tokenId => mapping(address currency => uint256 amount)) tipsByCurrencyByTokenId;
    mapping(address currency => TippingStats) tippingStatsByCurrency;
    mapping(address wallet => mapping(address currency => TippingStats)) tippingStatsByCurrencyByWallet;
}

function getStorage() pure returns (Layout storage $) {
    assembly {
        $.slot := STORAGE_SLOT
    }
}

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                         FUNCTIONS                          */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
function sendTip(
    address self,
    TipRecipientType recipientType,
    bytes calldata data
) returns (uint256 protocolFee, uint256 tipAmount) {
    if (recipientType == TipRecipientType.Member) {
        return tipTokenId(self, data);
    } else if (recipientType == TipRecipientType.Bot) {
        return tipBot(self, data);
    } else {
        InvalidRecipientType.selector.revertWith();
    }
}

function tipBot(
    address self,
    bytes calldata data
) returns (uint256 protocolFee, uint256 tipAmount) {
    BotTipParams memory req = abi.decode(data, (BotTipParams));

    protocolFee;
    tipAmount = req.amount;

    validateTipRequest(msg.sender, req.receiver, req.currency, req.amount);
    depositTip(self, req.currency, req.amount);
    processTip(self, req.receiver, TipRecipientType.Bot, req.currency, req.amount, "");

    emit ITippingBase.TipSent(
        msg.sender,
        req.receiver,
        TipRecipientType.Bot,
        req.currency,
        req.amount,
        req.metadata.data
    );
}

function tipTokenId(
    address self,
    bytes calldata data
) returns (uint256 protocolFee, uint256 tipAmount) {
    MembershipTipParams memory req = abi.decode(data, (MembershipTipParams));

    validateTipRequest(msg.sender, req.receiver, req.currency, req.amount);
    depositTip(self, req.currency, req.amount);

    protocolFee = handleProtocolFee(req.currency, req.amount);
    tipAmount = req.amount - protocolFee;

    processTip(
        self,
        req.receiver,
        TipRecipientType.Member,
        req.currency,
        tipAmount,
        abi.encode(req.tokenId)
    );

    emitTipMember(req, tipAmount);
}

function tip(
    address self,
    TipRequest calldata req
) returns (uint256 protocolFee, uint256 tipAmount) {
    validateTipRequest(msg.sender, req.receiver, req.currency, req.amount);
    depositTip(self, req.currency, req.amount);

    protocolFee = handleProtocolFee(req.currency, req.amount);
    tipAmount = req.amount - protocolFee;

    processTip(
        self,
        req.receiver,
        TipRecipientType.Member,
        req.currency,
        tipAmount,
        abi.encode(req.tokenId)
    );

    MembershipTipParams memory params = MembershipTipParams({
        receiver: req.receiver,
        tokenId: req.tokenId,
        currency: req.currency,
        amount: req.amount,
        metadata: TipMetadata({messageId: req.messageId, channelId: req.channelId, data: ""})
    });

    emitTipMember(params, tipAmount);
}

function emitTipMember(MembershipTipParams memory req, uint256 tipAmount) {
    emit ITippingBase.Tip(
        req.tokenId,
        req.currency,
        msg.sender,
        req.receiver,
        req.amount,
        req.metadata.messageId,
        req.metadata.channelId
    );
    emit ITippingBase.TipSent(
        msg.sender,
        req.receiver,
        TipRecipientType.Member,
        req.currency,
        tipAmount,
        abi.encode(req.tokenId)
    );
}

function validateTipRequest(
    address sender,
    address receiver,
    address currency,
    uint256 amount
) pure {
    if (currency == address(0)) CurrencyIsZero.selector.revertWith();
    if (sender == receiver) CannotTipSelf.selector.revertWith();
    if (amount == 0) AmountIsZero.selector.revertWith();
}

function depositTip(address self, address currency, uint256 amount) {
    if (currency == CurrencyTransfer.NATIVE_TOKEN) {
        if (msg.value != amount) MsgValueMismatch.selector.revertWith();
    } else {
        if (msg.value != 0) UnexpectedETH.selector.revertWith();
        CurrencyTransfer.transferCurrency(currency, msg.sender, self, amount);
    }
}

function handleProtocolFee(address currency, uint256 amount) returns (uint256 protocolFee) {
    address spaceFactory = MembershipStorage.layout().spaceFactory;

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

function processTip(
    address self,
    address receiver,
    TipRecipientType recipientType,
    address currency,
    uint256 amount,
    bytes memory data
) {
    Layout storage $ = getStorage();

    // Add currency to set
    $.currencies.add(currency);

    // Update stats by currency
    TippingStats storage stats = $.tippingStatsByCurrency[currency];
    stats.tipAmount += amount;
    stats.totalTips += 1;

    // Update wallet-based tracking (all tips)
    $.tippingStatsByCurrencyByWallet[receiver][currency].tipAmount += amount;
    $.tippingStatsByCurrencyByWallet[receiver][currency].totalTips += 1;

    // Update tokenId-based tracking (backwards compatibility, only for Member tips)
    if (recipientType == TipRecipientType.Member) {
        uint256 tokenId = abi.decode(data, (uint256));
        $.tipsByCurrencyByTokenId[tokenId][currency] += amount;
    }

    // Transfer currency
    CurrencyTransfer.transferCurrency(currency, self, receiver, amount);
}

function getTipsByWallet(address wallet, address currency) view returns (uint256) {
    return getStorage().tippingStatsByCurrencyByWallet[wallet][currency].tipAmount;
}

function getTipCountByWallet(address wallet, address currency) view returns (uint256) {
    return getStorage().tippingStatsByCurrencyByWallet[wallet][currency].totalTips;
}

function getTipsByTokenId(uint256 tokenId, address currency) view returns (uint256) {
    return getStorage().tipsByCurrencyByTokenId[tokenId][currency];
}

function getTippingCurrencies() view returns (address[] memory) {
    return getStorage().currencies.values();
}

function getTotalTipsByCurrency(address currency) view returns (uint256) {
    return getStorage().tippingStatsByCurrency[currency].totalTips;
}

function getTipAmountByCurrency(address currency) view returns (uint256) {
    return getStorage().tippingStatsByCurrency[currency].tipAmount;
}
