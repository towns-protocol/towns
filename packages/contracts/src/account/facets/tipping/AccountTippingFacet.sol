// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITipping} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import {AccountTippingMod} from "./AccountTippingMod.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

contract AccountTippingFacet is ITipping, ReentrancyGuardTransient, Facet {
    using EnumerableSetLib for EnumerableSetLib.AddressSet;
    using AccountTippingMod for AccountTippingMod.Layout;
    using CustomRevert for bytes4;

    function __AccountTippingFacet_init() external onlyInitializing {
        _addInterface(type(ITipping).interfaceId);
    }

    /// @inheritdoc ITipping
    function sendTip(
        TipRecipientType recipientType,
        bytes calldata data
    ) external payable nonReentrant {
        AccountTippingMod.getStorage().tipAny(address(this), uint8(recipientType), data);
    }

    /// @inheritdoc ITipping
    function tip(TipRequest calldata) external payable {
        Deprecated.selector.revertWith();
    }

    /// @inheritdoc ITipping
    function tipsByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return AccountTippingMod.getStorage().accountStatsByCurrency[wallet][currency].amount;
    }

    /// @inheritdoc ITipping
    function tipCountByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return AccountTippingMod.getStorage().accountStatsByCurrency[wallet][currency].total;
    }

    /// @inheritdoc ITipping
    function tipsByCurrencyAndTokenId(uint256, address) external pure returns (uint256) {
        Deprecated.selector.revertWith();
    }

    /// @inheritdoc ITipping
    function tippingCurrencies() external view returns (address[] memory) {
        return AccountTippingMod.getStorage().currencies.values();
    }

    /// @inheritdoc ITipping
    function totalTipsByCurrency(address currency) external view returns (uint256) {
        return AccountTippingMod.getStorage().currencyStats[currency].total;
    }

    /// @inheritdoc ITipping
    function tipAmountByCurrency(address currency) external view returns (uint256) {
        return AccountTippingMod.getStorage().currencyStats[currency].amount;
    }
}
