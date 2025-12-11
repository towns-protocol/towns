// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITipping} from "./ITipping.sol";
import {ITownsPointsBase} from "../../../airdrop/points/ITownsPoints.sol";

// libraries
import {TippingMod} from "./TippingMod.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {PointsBase} from "../points/PointsBase.sol";

contract TippingFacet is ITipping, PointsBase, ERC721ABase, Facet, ReentrancyGuard {
    function __Tipping_init() external onlyInitializing {
        _addInterface(type(ITipping).interfaceId);
    }

    /// @inheritdoc ITipping
    function sendTip(
        TippingMod.TipRecipientType recipientType,
        bytes calldata data
    ) external payable nonReentrant {
        (uint256 protocolFee, ) = TippingMod.sendTip(address(this), recipientType, data);

        if (protocolFee > 0) {
            address airdropDiamond = _getAirdropDiamond();
            uint256 points = _getPoints(
                airdropDiamond,
                ITownsPointsBase.Action.Tip,
                abi.encode(protocolFee)
            );
            _mintPoints(airdropDiamond, msg.sender, points);
        }
    }

    /// @inheritdoc ITipping
    function tip(TippingMod.TipRequest calldata tipRequest) external payable nonReentrant {
        (uint256 protocolFee, ) = TippingMod.tip(address(this), tipRequest);

        if (protocolFee > 0) {
            address airdropDiamond = _getAirdropDiamond();
            uint256 points = _getPoints(
                airdropDiamond,
                ITownsPointsBase.Action.Tip,
                abi.encode(protocolFee)
            );
            _mintPoints(airdropDiamond, msg.sender, points);
        }
    }

    /// @inheritdoc ITipping
    function tipsByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return TippingMod.getTipsByWallet(wallet, currency);
    }

    /// @inheritdoc ITipping
    function tipCountByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256) {
        return TippingMod.getTipCountByWallet(wallet, currency);
    }

    /// @inheritdoc ITipping
    function tipsByCurrencyAndTokenId(
        uint256 tokenId,
        address currency
    ) external view returns (uint256) {
        return TippingMod.getTipsByTokenId(tokenId, currency);
    }

    /// @inheritdoc ITipping
    function tippingCurrencies() external view returns (address[] memory) {
        return TippingMod.getTippingCurrencies();
    }

    /// @inheritdoc ITipping
    function totalTipsByCurrency(address currency) external view returns (uint256) {
        return TippingMod.getTotalTipsByCurrency(currency);
    }

    /// @inheritdoc ITipping
    function tipAmountByCurrency(address currency) external view returns (uint256) {
        return TippingMod.getTipAmountByCurrency(currency);
    }
}
