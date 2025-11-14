// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITipping} from "./ITipping.sol";

// libraries

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {TippingBase} from "./TippingBase.sol";

contract TippingFacet is ITipping, TippingBase, ERC721ABase, Facet, ReentrancyGuard {
    function __Tipping_init() external onlyInitializing {
        _addInterface(type(ITipping).interfaceId);
    }

    /// @inheritdoc ITipping
    function sendTip(
        TipRecipientType recipientType,
        bytes calldata data
    ) external payable nonReentrant {
        _sendTip(recipientType, data);
    }

    /// @inheritdoc ITipping
    function tip(TipRequest calldata tipRequest) external payable nonReentrant {
        _tip(tipRequest);
    }

    /// @inheritdoc ITipping
    function tipsByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return _getTipsByWallet(wallet, currency);
    }

    /// @inheritdoc ITipping
    function tipCountByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return _getTipCountByWallet(wallet, currency);
    }

    /// @inheritdoc ITipping
    function tipsByCurrencyAndTokenId(
        uint256 tokenId,
        address currency
    ) external view returns (uint256) {
        return _getTipsByTokenId(tokenId, currency);
    }

    /// @inheritdoc ITipping
    function tippingCurrencies() external view returns (address[] memory) {
        return _getTippingCurrencies();
    }

    /// @inheritdoc ITipping
    function totalTipsByCurrency(address currency) external view returns (uint256) {
        return _getTotalTipsByCurrency(currency);
    }

    /// @inheritdoc ITipping
    function tipAmountByCurrency(address currency) external view returns (uint256) {
        return _getTipAmountByCurrency(currency);
    }
}
