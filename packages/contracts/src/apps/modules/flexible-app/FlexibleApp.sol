// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IFlexibleApp} from "./IFlexibleApp.sol";
import {ITownsApp} from "../../ITownsApp.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {ExecutionManifest, IExecutionModule, ManifestExecutionFunction} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";

// libraries
import {FlexibleAppStorage} from "./FlexibleAppStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";

// contracts
import {FlexibleAppBase} from "./FlexibleAppBase.sol";
import {BaseApp} from "../../BaseApp.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {Initializable} from "solady/utils/Initializable.sol";

contract FlexibleApp is IFlexibleApp, Ownable, BaseApp, Initializable, FlexibleAppBase {
    using CustomRevert for bytes4;
    using FlexibleAppStorage for FlexibleAppStorage.Layout;

    // Override onlyOwner to use Ownable's implementation
    modifier onlyOwner() override(FlexibleAppBase, Ownable) {
        Ownable._checkOwner();
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        INITIALIZATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFlexibleApp
    function initialize(
        address owner,
        string calldata appId,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration,
        address client,
        bool useAllowList
    ) external initializer {
        // Set Ownable owner
        _setOwner(owner);

        // Initialize CoreConfig via mapping
        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        FlexibleAppStorage.CoreConfig storage core = $.config[FlexibleAppStorage.CORE_CONFIG_KEY];
        core.owner = owner;
        core.client = client;
        core.useAllowList = useAllowList;

        // Generate first appId (v1)
        bytes32 v1AppId = keccak256(abi.encodePacked(appId, block.timestamp, owner));

        // Register first version
        _publishVersion(v1AppId, appId, permissions, installPrice, accessDuration);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      VERSION MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFlexibleApp
    function publishVersion(
        bytes32 appId,
        string calldata name,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) external onlyOwner {
        _publishVersion(appId, name, permissions, installPrice, accessDuration);
    }

    /// @inheritdoc IFlexibleApp
    function getVersion(bytes32 appId) external view returns (FlexibleAppStorage.Metadata memory) {
        return _getVersionMetadata(appId);
    }

    /// @inheritdoc IFlexibleApp
    function getLatestVersion() external view returns (FlexibleAppStorage.Metadata memory) {
        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        return _getVersionMetadata($.latestAppId);
    }

    /// @inheritdoc IFlexibleApp
    function updateVersion(
        bytes32 appId,
        string calldata name,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) external onlyOwner {
        _updateVersion(appId, name, permissions, installPrice, accessDuration);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TARGET MANAGEMENT                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFlexibleApp
    function addAllowedTarget(address target) external onlyOwner {
        if (target == address(0)) FlexibleAppZeroAddress.selector.revertWith();

        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        $.allowedTargets[target] = true;

        emit TargetAllowed(target);
    }

    /// @inheritdoc IFlexibleApp
    function removeAllowedTarget(address target) external onlyOwner {
        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        $.allowedTargets[target] = false;

        emit TargetRemoved(target);
    }

    /// @inheritdoc IFlexibleApp
    function setUseAllowList(bool enabled) external onlyOwner {
        FlexibleAppStorage.CoreConfig storage core = FlexibleAppStorage.getCoreConfig();
        core.useAllowList = enabled;

        emit AllowListModeChanged(enabled);
    }

    /// @inheritdoc IFlexibleApp
    function isTargetAllowed(address target) external view returns (bool) {
        FlexibleAppStorage.CoreConfig storage core = FlexibleAppStorage.getCoreConfig();

        // If allow list is disabled, all non-protected targets are allowed
        if (!core.useAllowList) {
            return !_isProtectedContract(target);
        }

        // If allow list is enabled, check both allow list and protected list
        return FlexibleAppStorage.isTargetAllowed(target) && !_isProtectedContract(target);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EXECUTION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFlexibleApp
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyAuthorized returns (bytes memory) {
        return _handleArbitraryCall(target, value, data);
    }

    /// @inheritdoc IFlexibleApp
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata data
    ) external payable onlyAuthorized returns (bytes[] memory) {
        return _handleBatchCall(targets, values, data);
    }

    /// @inheritdoc IFlexibleApp
    function processRequest(
        bytes calldata request
    ) external onlyInstallingAccount returns (bytes memory) {
        // Decode request type
        (RequestType requestType, bytes memory requestData) = abi.decode(
            request,
            (RequestType, bytes)
        );
        return _handleRequest(requestType, requestData);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    SIMPLEAPP COMPATIBILITY                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFlexibleApp
    function withdrawETH(address recipient) external onlyOwner {
        if (recipient == address(0)) FlexibleAppZeroAddress.selector.revertWith();

        uint256 balance = address(this).balance;
        if (balance == 0) NoBalanceToWithdraw.selector.revertWith();

        CurrencyTransfer.safeTransferNativeToken(recipient, balance);

        emit Withdrawal(recipient, balance);
    }

    /// @inheritdoc IFlexibleApp
    function sendCurrency(
        address recipient,
        address currency,
        uint256 amount
    ) external onlyAuthorized {
        _handleSendCurrency(recipient, currency, amount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ACCOUNT MANAGEMENT                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IFlexibleApp
    function isInstalledOn(address account) external view returns (bool) {
        return FlexibleAppStorage.isInstalled(account);
    }

    /// @inheritdoc IFlexibleApp
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
        )
    {
        FlexibleAppStorage.AccountContext storage ctx = FlexibleAppStorage.getContext(account);

        return (ctx.currentAppId, ctx.isInstalled, ctx.installedAt, ctx.expiresAt, ctx.metadata);
    }

    /// @inheritdoc IFlexibleApp
    function getAccountVersion(address account) external view returns (bytes32) {
        return FlexibleAppStorage.getAccountVersion(account);
    }

    /// @inheritdoc IFlexibleApp
    function getTotalInstalled() external view returns (uint256) {
        return FlexibleAppStorage.getLayout().totalInstalled;
    }

    /// @inheritdoc IFlexibleApp
    function upgradeAccountVersion(bytes32 newAppId) external {
        _onlyAuthorizedForAccount(msg.sender);
        _upgradeAccountVersion(msg.sender, newAppId);
    }

    /// @inheritdoc IFlexibleApp
    function authorizeAccountCaller(address account, address caller, bool authorized) external {
        _onlyAuthorizedForAccount(account);

        if (caller == address(0)) FlexibleAppZeroAddress.selector.revertWith();

        FlexibleAppStorage.AccountContext storage ctx = FlexibleAppStorage.getContext(account);
        ctx.authorizedCallers[caller] = authorized;

        emit CallerAuthorized(account, caller, authorized);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    ERC-6900 MODULE INTERFACE               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IModule
    function onInstall(bytes calldata data) external override(BaseApp, IModule) {
        // Decode appId from data (first 32 bytes)
        bytes32 appId;
        if (data.length >= 32) {
            appId = abi.decode(data[:32], (bytes32));
        } else {
            // Use latest version if no appId provided
            appId = FlexibleAppStorage.getLayout().latestAppId;
        }

        // Get remaining data for context metadata
        bytes calldata contextData = data.length > 32 ? data[32:] : data[0:0];

        _onInstallInternal(appId, contextData);
    }

    /// @inheritdoc IModule
    function onUninstall(bytes calldata data) external override(BaseApp, IModule) {
        _onUninstallInternal(data);
    }

    /// @inheritdoc IExecutionModule
    function executionManifest() external pure returns (ExecutionManifest memory manifest) {
        manifest.executionFunctions = new ManifestExecutionFunction[](4);

        // processRequest - main bot interaction
        manifest.executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: this.processRequest.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        // getAccountContext - view
        manifest.executionFunctions[1] = ManifestExecutionFunction({
            executionSelector: this.getAccountContext.selector,
            skipRuntimeValidation: true,
            allowGlobalValidation: true
        });

        // upgradeAccountVersion - version migration
        manifest.executionFunctions[2] = ManifestExecutionFunction({
            executionSelector: this.upgradeAccountVersion.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: true
        });

        // authorizeAccountCaller - delegation
        manifest.executionFunctions[3] = ManifestExecutionFunction({
            executionSelector: this.authorizeAccountCaller.selector,
            skipRuntimeValidation: false,
            allowGlobalValidation: false
        });
    }

    /// @inheritdoc IModule
    function moduleId() public view returns (string memory) {
        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        FlexibleAppStorage.Metadata storage metadata = $.appMetadata[$.latestAppId];
        return metadata.name;
    }

    /// @inheritdoc ITownsApp
    function requiredPermissions() external view returns (bytes32[] memory) {
        // Return permissions for caller's current version
        FlexibleAppStorage.AccountContext storage ctx = FlexibleAppStorage.getContext(msg.sender);

        if (!ctx.isInstalled) {
            // If not installed, return latest version permissions
            FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
            return $.appMetadata[$.latestAppId].permissions;
        }

        return FlexibleAppStorage.getMetadata(ctx.currentAppId).permissions;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      BASEAPP OVERRIDES                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _installPrice() internal view override returns (uint256) {
        FlexibleAppStorage.AccountContext storage ctx = FlexibleAppStorage.getContext(msg.sender);

        if (!ctx.isInstalled) {
            // If not installed, return latest version price
            FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
            return $.appMetadata[$.latestAppId].installPrice;
        }

        return FlexibleAppStorage.getMetadata(ctx.currentAppId).installPrice;
    }

    function _accessDuration() internal view override returns (uint48) {
        FlexibleAppStorage.AccountContext storage ctx = FlexibleAppStorage.getContext(msg.sender);

        if (!ctx.isInstalled) {
            // If not installed, return latest version duration
            FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
            return $.appMetadata[$.latestAppId].accessDuration;
        }

        return FlexibleAppStorage.getMetadata(ctx.currentAppId).accessDuration;
    }

    function _moduleOwner() internal view override returns (address) {
        return owner();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    PROTECTED CONTRACTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _isProtectedContract(address /* target */) internal view override returns (bool) {
        // TODO: Implement actual protected contract checks
        // Should check against: AppRegistry, SpaceFactory, RiverAirdrop, etc.
        // For now, return false to allow all targets (only allow list restriction applies)
        return false;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      RECEIVE FUNCTION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    receive() external payable override(BaseApp) {
        // Allow receiving ETH
    }
}
