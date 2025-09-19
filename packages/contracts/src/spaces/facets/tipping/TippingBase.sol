// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITippingBase} from "./ITipping.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts

abstract contract TippingBase is ITippingBase {
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for bytes4;

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.tipping.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb6cb334a9eea0cca2581db4520b45ac6f03de8e3927292302206bb82168be300;

    struct TippingStats {
        uint256 totalTips;
        uint256 tipAmount;
    }

    struct Layout {
        EnumerableSet.AddressSet currencies;
        mapping(uint256 tokenId => mapping(address currency => uint256 amount)) tipsByCurrencyByTokenId;
        mapping(address currency => TippingStats) tippingStatsByCurrency;
        mapping(address appAddress => mapping(address currency => uint256 amount)) tipsByCurrencyByApp;
    }

    function _getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    function _tipMember(
        address sender,
        address receiver,
        uint256 tokenId,
        address currency,
        uint256 amount
    ) internal {
        Layout storage $ = _getLayout();

        $.currencies.add(currency);
        $.tipsByCurrencyByTokenId[tokenId][currency] += amount;

        TippingStats storage stats = $.tippingStatsByCurrency[currency];
        stats.tipAmount += amount;
        stats.totalTips += 1;

        CurrencyTransfer.transferCurrency(currency, sender, receiver, amount);
    }

    function _tipApp(
        address sender,
        address appAddress,
        address currency,
        uint256 amount
    ) internal {
        Layout storage $ = _getLayout();

        $.currencies.add(currency);
        $.tipsByCurrencyByApp[appAddress][currency] += amount;

        TippingStats storage stats = $.tippingStatsByCurrency[currency];
        stats.tipAmount += amount;
        stats.totalTips += 1;

        CurrencyTransfer.transferCurrency(currency, sender, appAddress, amount);
    }

    function _totalTipsByCurrency(address currency) internal view returns (uint256) {
        return _getLayout().tippingStatsByCurrency[currency].totalTips;
    }

    function _tipAmountByCurrency(address currency) internal view returns (uint256) {
        return _getLayout().tippingStatsByCurrency[currency].tipAmount;
    }

    function _tipsByCurrencyByTokenId(
        uint256 tokenId,
        address currency
    ) internal view returns (uint256) {
        return _getLayout().tipsByCurrencyByTokenId[tokenId][currency];
    }

    function _tippingCurrencies() internal view returns (address[] memory) {
        return _getLayout().currencies.values();
    }

    function _tipsByCurrencyByApp(
        address appAddress,
        address currency
    ) internal view returns (uint256) {
        return _getLayout().tipsByCurrencyByApp[appAddress][currency];
    }

    function _validateTipRequest(
        address sender,
        address receiver,
        address currency,
        uint256 amount
    ) internal pure {
        if (currency == address(0)) CurrencyIsZero.selector.revertWith();
        if (receiver == address(0)) InvalidReceiver.selector.revertWith();
        if (sender == receiver) CannotTipSelf.selector.revertWith();
        if (amount == 0) AmountIsZero.selector.revertWith();
    }

    function _validateReceiverIsContract(address receiver) internal view {
        bool isContract;
        assembly ("memory-safe") {
            isContract := gt(extcodesize(receiver), 0)
        }
        if (!isContract) InvalidReceiver.selector.revertWith();
    }
}
