// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITownsApp} from "../../ITownsApp.sol";
import {FlexibleAppStorage} from "./FlexibleAppStorage.sol";

// libraries

// contracts

interface IFlexibleAppBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error FlexibleAppUnauthorized();
    error NotInstalled();
    error AlreadyInstalled();
    error VersionNotFound();
    error FlexibleAppExecutionFailed();
    error InvalidTarget();
    error TargetNotAllowed();
    error InvalidCaller();
    error FlexibleAppZeroAddress();
    error InvalidAmount();
    error InvalidArrayLength();
    error InvalidCurrency();
    error NoBalanceToWithdraw();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event Executed(address indexed target, uint256 value, bytes data);
    event ExecutionFailedEvent(address indexed target, uint256 value, bytes data, bytes reason);
    event AccountInstalled(address indexed account, bytes32 indexed appId, uint48 expiresAt);
    event AccountUninstalled(address indexed account, bytes32 indexed appId);
    event AccountUpgraded(
        address indexed account,
        bytes32 indexed oldAppId,
        bytes32 indexed newAppId
    );
    event VersionPublished(
        bytes32 indexed appId,
        string name,
        uint256 installPrice,
        uint48 accessDuration
    );
    event CallerAuthorized(address indexed account, address indexed caller, bool authorized);
    event MetadataUpdated(bytes32 indexed appId);
    event Withdrawal(address indexed recipient, uint256 amount);
    event SendCurrency(address indexed recipient, address indexed currency, uint256 amount);
    event TargetAllowed(address indexed target);
    event TargetRemoved(address indexed target);
    event AllowListModeChanged(bool enabled);
}

interface IFlexibleApp is IFlexibleAppBase, ITownsApp {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        INITIALIZATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the FlexibleApp
    /// @param owner The owner address
    /// @param appId The initial app identifier
    /// @param permissions The initial permissions
    /// @param installPrice The initial install price
    /// @param accessDuration The initial access duration
    /// @param client The client address
    /// @param useAllowList Whether to use the allow list mode
    function initialize(
        address owner,
        string calldata appId,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration,
        address client,
        bool useAllowList
    ) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      VERSION MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Publishes a new version of the app
    /// @param appId The unique identifier for this version
    /// @param name The name of this version
    /// @param permissions The permissions required for this version
    /// @param installPrice The installation price for this version
    /// @param accessDuration The access duration for this version
    function publishVersion(
        bytes32 appId,
        string calldata name,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) external;

    /// @notice Gets the metadata for a specific version
    /// @param appId The version ID
    /// @return metadata The version metadata
    function getVersion(bytes32 appId) external view returns (FlexibleAppStorage.Metadata memory);

    /// @notice Gets the latest version metadata
    /// @return metadata The latest version metadata
    function getLatestVersion() external view returns (FlexibleAppStorage.Metadata memory);

    /// @notice Updates an existing version's metadata
    /// @param appId The version ID to update
    /// @param name The new name
    /// @param permissions The new permissions
    /// @param installPrice The new install price
    /// @param accessDuration The new access duration
    function updateVersion(
        bytes32 appId,
        string calldata name,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TARGET MANAGEMENT                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Adds a target contract to the allow list
    /// @param target The target contract address
    function addAllowedTarget(address target) external;

    /// @notice Removes a target contract from the allow list
    /// @param target The target contract address
    function removeAllowedTarget(address target) external;

    /// @notice Sets whether to use the allow list
    /// @param enabled True to enable allow list mode, false to allow all except blacklist
    function setUseAllowList(bool enabled) external;

    /// @notice Checks if a target is allowed
    /// @param target The target contract address
    /// @return allowed True if the target is allowed
    function isTargetAllowed(address target) external view returns (bool);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXECUTION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Executes an arbitrary contract call
    /// @param target The target contract address
    /// @param value The ETH value to send
    /// @param data The calldata to send
    /// @return result The result of the call
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory);

    /// @notice Executes multiple contract calls in a batch
    /// @param targets The target contract addresses
    /// @param values The ETH values to send
    /// @param data The calldata arrays to send
    /// @return results The results of the calls
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata data
    ) external payable returns (bytes[] memory);

    /// @notice Processes a request from an installing account
    /// @param request The request data
    /// @return response The response data
    function processRequest(bytes calldata request) external returns (bytes memory response);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    SIMPLEAPP COMPATIBILITY                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Withdraws ETH from the app
    /// @param recipient The recipient address
    function withdrawETH(address recipient) external;

    /// @notice Sends currency from the app
    /// @param recipient The recipient address
    /// @param currency The currency address (address(0) for ETH)
    /// @param amount The amount to send
    function sendCurrency(address recipient, address currency, uint256 amount) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ACCOUNT MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Checks if the app is installed on an account
    /// @param account The account address
    /// @return installed True if installed
    function isInstalledOn(address account) external view returns (bool);

    /// @notice Gets the account context (Note: authorizedCallers mapping not included in return)
    /// @param account The account address
    /// @return currentAppId The current app version ID
    /// @return isInstalled Whether the app is installed
    /// @return installedAt When the app was installed
    /// @return expiresAt When the app access expires
    /// @return metadata Custom metadata bytes
    function getAccountContext(
        address account
    )
        external
        view
        returns (
            bytes32 currentAppId,
            bool isInstalled,
            uint48 installedAt,
            uint48 expiresAt,
            bytes memory metadata
        );

    /// @notice Gets the app version an account is using
    /// @param account The account address
    /// @return appId The app version ID
    function getAccountVersion(address account) external view returns (bytes32);

    /// @notice Gets the total number of installed accounts
    /// @return total The total number of installations
    function getTotalInstalled() external view returns (uint256);

    /// @notice Upgrades an account to a new version
    /// @param newAppId The new version ID
    function upgradeAccountVersion(bytes32 newAppId) external;

    /// @notice Authorizes or revokes a caller for an account
    /// @param account The account address
    /// @param caller The caller address to authorize/revoke
    /// @param authorized True to authorize, false to revoke
    function authorizeAccountCaller(address account, address caller, bool authorized) external;
}
