// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITipping} from "./ITipping.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {ERC721ABase} from "../../../diamond/facets/token/ERC721A/ERC721ABase.sol";
import {TippingBase} from "./TippingBase.sol";

contract TippingFacet is ITipping, TippingBase, ERC721ABase, Facet, ReentrancyGuard {
    using CustomRevert for bytes4;

    function __Tipping_init() external onlyInitializing {
        _addInterface(type(ITipping).interfaceId);
    }

    /// @inheritdoc ITipping
    function sendTip(
        TipRecipientType recipientType,
        bytes calldata data
    ) external payable nonReentrant {
        if (recipientType == TipRecipientType.Member) {
            // MembershipTipParams minimum: 32 (offset) + 128 (4 fields) + 32 (metadata offset)
            // + 64 (messageId, channelId) + 32 (data offset) + 32 (data length) = 320 bytes
            if (data.length < 0x140) InvalidTipData.selector.revertWith();

            // equivalent: abi.decode(data, (MembershipTipParams))
            MembershipTipParams calldata params;
            assembly {
                // variable length struct: data.offset points to the offset where struct begins
                params := add(data.offset, calldataload(data.offset))
            }
            _sendMemberTip(
                params.receiver,
                params.tokenId,
                params.currency,
                params.amount,
                params.metadata.messageId,
                params.metadata.channelId,
                params.metadata.data
            );
        } else if (recipientType == TipRecipientType.Bot) {
            // BotTipParams minimum: 32 (offset) + 128 (4 fields) + 32 (metadata offset)
            // + 64 (messageId, channelId) + 32 (data offset) + 32 (data length) = 320 bytes
            if (data.length < 0x140) InvalidTipData.selector.revertWith();

            // equivalent: abi.decode(data, (BotTipParams))
            BotTipParams calldata params;
            assembly {
                params := add(data.offset, calldataload(data.offset))
            }
            _sendBotTip(params.receiver, params.currency, params.amount, params.metadata.data);
        } else {
            InvalidRecipientType.selector.revertWith();
        }
    }

    /// @inheritdoc ITipping
    function tip(TipRequest calldata tipRequest) external payable nonReentrant {
        _sendMemberTip(
            tipRequest.receiver,
            tipRequest.tokenId,
            tipRequest.currency,
            tipRequest.amount,
            tipRequest.messageId,
            tipRequest.channelId,
            abi.encode(tipRequest.tokenId)
        );
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
