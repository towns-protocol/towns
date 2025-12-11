// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {TippingMod} from "./TippingMod.sol";

interface ITippingBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    event TipSent(
        address indexed sender,
        address indexed receiver,
        TippingMod.TipRecipientType indexed recipientType,
        address currency,
        uint256 amount,
        bytes data
    );

    // Maintain legacy event for backwards compatibility
    event Tip(
        uint256 indexed tokenId,
        address indexed currency,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 messageId,
        bytes32 channelId
    );
}

interface ITipping is ITippingBase {
    /// @notice Send a tip using flexible encoding based on recipient type
    /// @param recipientType The type of recipient (Member, Wallet, Bot, Pool)
    /// @param data ABI-encoded tip params based on recipientType:
    ///   - Member: abi.encode(MembershipTipParams)
    ///   - Wallet: abi.encode(WalletTipParams)
    ///   - Bot: abi.encode(BotTipParams)
    function sendTip(
        TippingMod.TipRecipientType recipientType,
        bytes calldata data
    ) external payable;

    /// @notice Sends a tip to a space member (legacy)
    /// @param tipRequest The tip request containing token ID, currency, amount, message ID and
    /// channel ID
    /// @dev Requires sender and receiver to be members of the space
    /// @dev Requires amount > 0 and valid currency address
    /// @dev Emits Tip event
    ///@custom:deprecated Use sendTip instead
    function tip(TippingMod.TipRequest calldata tipRequest) external payable;

    /// @notice Get tips received by wallet address and currency
    /// @param wallet The wallet address to get tips for
    /// @param currency The currency address to get tips in
    /// @return The total amount of tips received in the specified currency
    function tipsByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256);

    /// @notice Get tip count by wallet and currency
    /// @param wallet The wallet address to get tip count for
    /// @param currency The currency address to get tip count in
    /// @return The total number of tips received in the specified currency
    function tipCountByWalletAndCurrency(
        address wallet,
        address currency
    ) external view returns (uint256);

    /// @notice Gets the total tips received for a token ID in a specific currency
    /// @param tokenId The token ID to get tips for
    /// @param currency The currency address to get tips in
    /// @return The total amount of tips received in the specified currency
    function tipsByCurrencyAndTokenId(
        uint256 tokenId,
        address currency
    ) external view returns (uint256);

    /// @notice Gets the list of currencies that have been tipped to the space
    /// @return An array of currency addresses
    function tippingCurrencies() external view returns (address[] memory);

    /// @notice Gets the total number of tips received in a specific currency
    /// @param currency The currency address to get tips for
    /// @return The total number of tips received in the specified currency
    function totalTipsByCurrency(address currency) external view returns (uint256);

    /// @notice Gets the total amount of tips received in a specific currency
    /// @param currency The currency address to get tips for
    /// @return The total amount of tips received in the specified currency
    function tipAmountByCurrency(address currency) external view returns (uint256);
}
