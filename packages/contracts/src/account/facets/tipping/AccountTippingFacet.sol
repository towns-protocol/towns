// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITipping} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import "./AccountTippingMod.sol" as AccountTipping;
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

contract AccountTippingFacet is ITipping, ReentrancyGuardTransient, Facet {
    using EnumerableSetLib for EnumerableSetLib.AddressSet;
    function __AccountTippingFacet_init() external onlyInitializing {
        _addInterface(type(ITipping).interfaceId);
    }

    /// @inheritdoc ITipping
    function sendTip(
        TipRecipientType recipientType,
        bytes calldata data
    ) external payable nonReentrant {
        AccountTipping.tipAny(address(this), uint8(recipientType), data);
    }

    /// @inheritdoc ITipping
    function tip(TipRequest calldata) external payable {
        revert Deprecated();
    }

    /// @inheritdoc ITipping
    function tipsByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return AccountTipping.getStorage().accountStatsByCurrency[wallet][currency].amount;
    }

    /// @inheritdoc ITipping
    function tipCountByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return AccountTipping.getStorage().accountStatsByCurrency[wallet][currency].total;
    }

    /// @inheritdoc ITipping
    function tipsByCurrencyAndTokenId(uint256, address) external pure returns (uint256) {
        revert Deprecated();
    }

    /// @inheritdoc ITipping
    function tippingCurrencies() external view returns (address[] memory) {
        return AccountTipping.getStorage().currencies.values();
    }

    /// @inheritdoc ITipping
    function totalTipsByCurrency(address currency) external view returns (uint256) {
        return AccountTipping.getStorage().currencyStats[currency].total;
    }

    /// @inheritdoc ITipping
    function tipAmountByCurrency(address currency) external view returns (uint256) {
        return AccountTipping.getStorage().currencyStats[currency].amount;
    }
}
