// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ITippingBase {
    enum TipRecipientType {
        Member, // Tips to token holders
        Bot, // Tips to bot wallets
        Any // Tips to any address
    }

    struct TipMetadata {
        bytes32 messageId;
        bytes32 channelId;
        bytes data; // Extensible metadata
    }

    /// @notice Params for any tip
    struct AnyTipParams {
        address currency;
        address sender;
        address receiver;
        uint256 amount;
        bytes data;
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
    struct TipRequest {
        address receiver;
        uint256 tokenId;
        address currency;
        uint256 amount;
        bytes32 messageId;
        bytes32 channelId;
    }

    /// @notice Emitted when a tip is sent to any recipient type
    /// @param sender The address that sent the tip
    /// @param receiver The address that received the tip
    /// @param recipientType The type of recipient (Member, Bot, Any)
    /// @param currency The currency address (NATIVE_TOKEN or ERC20)
    /// @param amount The tip amount after protocol fees
    /// @param data Additional metadata (tokenId for members, appId for bots, etc.)
    event TipSent(
        address indexed sender,
        address indexed receiver,
        TipRecipientType indexed recipientType,
        address currency,
        uint256 amount,
        bytes data
    );

    /// @notice Legacy event for member tips, maintained for backwards compatibility
    /// @param tokenId The membership token ID of the receiver
    /// @param currency The currency address (NATIVE_TOKEN or ERC20)
    /// @param sender The address that sent the tip
    /// @param receiver The address that received the tip
    /// @param amount The raw tip amount before protocol fees
    /// @param messageId The message ID associated with the tip
    /// @param channelId The channel ID where the tip was sent
    event Tip(
        uint256 indexed tokenId,
        address indexed currency,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 messageId,
        bytes32 channelId
    );

    error InvalidRecipientType();
    error InvalidTipData();
    error CannotTipSelf();
    error AmountIsZero();
    error CurrencyIsZero();
    error MsgValueMismatch();
    error UnexpectedETH();
    error NotSenderOfTip();
    error Deprecated();
    error InvalidAddressInput();
}

interface ITipping is ITippingBase {
    /// @notice Send a tip using flexible encoding based on recipient type
    /// @param recipientType The type of recipient (Member, Wallet, Bot, Pool)
    /// @param data ABI-encoded tip params based on recipientType:
    ///   - Member: abi.encode(MembershipTipParams)
    ///   - Bot: abi.encode(BotTipParams)
    ///   - Any: abi.encode(AnyTipParams)
    function sendTip(TipRecipientType recipientType, bytes calldata data) external payable;

    /// @notice Sends a tip to a space member (legacy)
    /// @param tipRequest The tip request containing token ID, currency, amount, message ID and
    /// channel ID
    /// @dev Requires sender and receiver to be members of the space
    /// @dev Requires amount > 0 and valid currency address
    /// @dev Emits Tip event
    function tip(TipRequest calldata tipRequest) external payable;

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
