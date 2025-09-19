// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ITippingBase {
    // =============================================================
    //                           Structs
    // =============================================================

    struct TipRequest {
        address receiver;
        uint256 tokenId;
        address currency;
        uint256 amount;
        bytes32 messageId;
        bytes32 channelId;
    }

    struct TipAppRequest {
        address appAddress;
        address currency;
        uint256 amount;
        bytes32 messageId;
        bytes32 channelId;
        bytes metadata; // Optional metadata for the app to process
    }

    // =============================================================
    //                           Events
    // =============================================================

    event Tip(
        uint256 indexed tokenId,
        address indexed currency,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 messageId,
        bytes32 channelId
    );

    event TipApp(
        address indexed appAddress,
        address indexed currency,
        address indexed sender,
        uint256 amount,
        bytes32 messageId,
        bytes32 channelId,
        bytes metadata
    );

    // =============================================================
    //                           Errors
    // =============================================================

    error TokenDoesNotExist();
    error ReceiverIsNotMember();
    error CannotTipSelf();
    error AmountIsZero();
    error CurrencyIsZero();
    error MsgValueMismatch();
    error UnexpectedETH();

    error InvalidReceiver();
    error AppNotAllowed();
}

interface ITipping is ITippingBase {
    /// @notice Sends a tip to a space member
    /// @param tipRequest The tip request containing token ID, currency, amount, message ID and
    /// channel ID
    /// @dev Requires sender and receiver to be members of the space
    /// @dev Requires amount > 0 and valid currency address
    /// @dev Emits Tip event
    function tip(TipRequest calldata tipRequest) external payable;

    /// @notice Sends a tip to an app contract
    /// @param tipAppRequest The tip request containing app address, currency, amount, message ID,
    /// channel ID and optional metadata
    /// @dev Requires sender to be a member of the space
    /// @dev Requires amount > 0 and valid currency address
    /// @dev Requires app address to be a contract
    /// @dev Emits TipApp event
    function tipApp(TipAppRequest calldata tipAppRequest) external payable;

    /// @notice Gets the total tips received for a token ID in a specific currency
    /// @param tokenId The token ID to get tips for
    /// @param currency The currency address to get tips in
    /// @return The total amount of tips received in the specified currency
    function tipsByCurrencyAndTokenId(
        uint256 tokenId,
        address currency
    ) external view returns (uint256);

    /// @notice Gets the total tips received by an app in a specific currency
    /// @param appAddress The app address to get tips for
    /// @param currency The currency address to get tips in
    /// @return The total amount of tips received in the specified currency
    function tipsByCurrencyAndApp(
        address appAddress,
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
