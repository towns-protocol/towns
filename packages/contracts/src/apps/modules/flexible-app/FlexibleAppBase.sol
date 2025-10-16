// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IFlexibleAppBase} from "./IFlexibleApp.sol";

// libraries
import {FlexibleAppStorage} from "./FlexibleAppStorage.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../utils/libraries/CurrencyTransfer.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// contracts

abstract contract FlexibleAppBase is IFlexibleAppBase {
    using CustomRevert for bytes4;
    using FlexibleAppStorage for FlexibleAppStorage.Layout;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      REQUEST TYPES                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    enum RequestType {
        SEND_CURRENCY,
        SEND_ETH,
        ARBITRARY_CALL,
        BATCH_CALL
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ACCESS CONTROL                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier onlyOwner() virtual {
        _onlyOwner();
        _;
    }

    modifier onlyAuthorized() {
        _onlyAuthorized();
        _;
    }

    modifier onlyInstallingAccount() {
        _onlyInstallingAccount();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != FlexibleAppStorage.getCoreConfig().owner) {
            FlexibleAppUnauthorized.selector.revertWith();
        }
    }

    function _onlyAuthorized() internal view {
        FlexibleAppStorage.CoreConfig storage core = FlexibleAppStorage.getCoreConfig();
        if (msg.sender != core.owner && msg.sender != core.client) {
            FlexibleAppUnauthorized.selector.revertWith();
        }
    }

    function _onlyInstallingAccount() internal view {
        if (!FlexibleAppStorage.isInstalled(msg.sender)) {
            NotInstalled.selector.revertWith();
        }
    }

    function _onlyAuthorizedForAccount(address account) internal view {
        FlexibleAppStorage.CoreConfig storage core = FlexibleAppStorage.getCoreConfig();
        FlexibleAppStorage.AccountContext storage ctx = FlexibleAppStorage.getContext(account);

        if (
            msg.sender != core.owner &&
            msg.sender != core.client &&
            msg.sender != account &&
            !ctx.authorizedCallers[msg.sender]
        ) {
            FlexibleAppUnauthorized.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    VERSION MANAGEMENT                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _publishVersion(
        bytes32 appId,
        string calldata name,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) internal {
        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        FlexibleAppStorage.Metadata storage metadata = $.appMetadata[appId];

        // Check if version already exists
        if (metadata.exists) {
            VersionNotFound.selector.revertWith();
        }

        metadata.name = name;
        metadata.permissions = permissions;
        metadata.installPrice = installPrice;
        metadata.accessDuration = accessDuration;
        metadata.exists = true;

        $.latestAppId = appId;

        emit VersionPublished(appId, name, installPrice, accessDuration);
    }

    function _updateVersion(
        bytes32 appId,
        string calldata name,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint48 accessDuration
    ) internal {
        FlexibleAppStorage.Metadata storage metadata = FlexibleAppStorage.getMetadata(appId);

        if (!metadata.exists) {
            VersionNotFound.selector.revertWith();
        }

        metadata.name = name;
        metadata.permissions = permissions;
        metadata.installPrice = installPrice;
        metadata.accessDuration = accessDuration;

        emit MetadataUpdated(appId);
    }

    function _getVersionMetadata(
        bytes32 appId
    ) internal view returns (FlexibleAppStorage.Metadata storage) {
        FlexibleAppStorage.Metadata storage metadata = FlexibleAppStorage.getMetadata(appId);
        if (!metadata.exists) {
            VersionNotFound.selector.revertWith();
        }
        return metadata;
    }

    function _validateVersion(bytes32 appId) internal view {
        if (!FlexibleAppStorage.getMetadata(appId).exists) {
            VersionNotFound.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    TARGET VALIDATION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _validateTarget(address target) internal view {
        // Check if target is a protected contract
        if (_isProtectedContract(target)) {
            InvalidTarget.selector.revertWith();
        }

        // Check allow list if enabled
        FlexibleAppStorage.CoreConfig storage core = FlexibleAppStorage.getCoreConfig();
        if (core.useAllowList) {
            if (!FlexibleAppStorage.isTargetAllowed(target)) {
                TargetNotAllowed.selector.revertWith();
            }
        }
    }

    function _isProtectedContract(address /* target */) internal view virtual returns (bool) {
        // Override this in the main contract to check against actual protected contracts
        // Default implementation returns false
        return false;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    EXECUTION HANDLERS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _handleRequest(
        RequestType requestType,
        bytes memory data
    ) internal returns (bytes memory) {
        if (requestType == RequestType.SEND_CURRENCY) {
            (address recipient, address currency, uint256 amount) = abi.decode(
                data,
                (address, address, uint256)
            );
            _handleSendCurrency(recipient, currency, amount);
            return "";
        } else if (requestType == RequestType.SEND_ETH) {
            (address recipient, uint256 amount) = abi.decode(data, (address, uint256));
            _handleSendCurrency(recipient, CurrencyTransfer.NATIVE_TOKEN, amount);
            return "";
        } else if (requestType == RequestType.ARBITRARY_CALL) {
            (address target, uint256 value, bytes memory callData) = abi.decode(
                data,
                (address, uint256, bytes)
            );
            return _handleArbitraryCall(target, value, callData);
        } else if (requestType == RequestType.BATCH_CALL) {
            (address[] memory targets, uint256[] memory values, bytes[] memory callDatas) = abi
                .decode(data, (address[], uint256[], bytes[]));
            return abi.encode(_handleBatchCall(targets, values, callDatas));
        }

        revert("Unknown request type");
    }

    function _handleSendCurrency(address recipient, address currency, uint256 amount) internal {
        if (recipient == address(0)) FlexibleAppZeroAddress.selector.revertWith();
        if (amount == 0) InvalidAmount.selector.revertWith();

        // Normalize currency address
        if (currency == address(0)) {
            currency = CurrencyTransfer.NATIVE_TOKEN;
        } else if (currency.code.length == 0) {
            InvalidCurrency.selector.revertWith();
        }

        CurrencyTransfer.transferCurrency(currency, address(this), recipient, amount);

        emit SendCurrency(recipient, currency, amount);
    }

    function _handleArbitraryCall(
        address target,
        uint256 value,
        bytes memory data
    ) internal returns (bytes memory) {
        _validateTarget(target);

        (bool success, bytes memory result) = target.call{value: value}(data);

        if (!success) {
            emit ExecutionFailedEvent(target, value, data, result);
            FlexibleAppExecutionFailed.selector.revertWith();
        }

        emit Executed(target, value, data);
        return result;
    }

    function _handleBatchCall(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory data
    ) internal returns (bytes[] memory) {
        if (targets.length != values.length || targets.length != data.length) {
            InvalidArrayLength.selector.revertWith();
        }

        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i; i < targets.length; ++i) {
            results[i] = _handleArbitraryCall(targets[i], values[i], data[i]);
        }

        return results;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  ACCOUNT CONTEXT MANAGEMENT                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _onInstallInternal(bytes32 appId, bytes calldata data) internal {
        _validateVersion(appId);

        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        FlexibleAppStorage.AccountContext storage ctx = $.contexts[msg.sender];

        if (ctx.isInstalled) {
            AlreadyInstalled.selector.revertWith();
        }

        FlexibleAppStorage.Metadata storage metadata = $.appMetadata[appId];

        ctx.currentAppId = appId;
        ctx.isInstalled = true;
        ctx.installedAt = uint48(block.timestamp);
        ctx.expiresAt = _calcExpiration(appId, metadata.accessDuration);

        if (data.length > 0) {
            ctx.metadata = data;
        }

        $.totalInstalled++;

        emit AccountInstalled(msg.sender, appId, ctx.expiresAt);
    }

    function _onUninstallInternal(bytes calldata /* data */) internal {
        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        FlexibleAppStorage.AccountContext storage ctx = $.contexts[msg.sender];

        if (!ctx.isInstalled) {
            NotInstalled.selector.revertWith();
        }

        bytes32 appId = ctx.currentAppId;

        ctx.isInstalled = false;
        ctx.currentAppId = bytes32(0);

        $.totalInstalled--;

        emit AccountUninstalled(msg.sender, appId);
    }

    function _upgradeAccountVersion(address account, bytes32 newAppId) internal {
        _validateVersion(newAppId);

        FlexibleAppStorage.Layout storage $ = FlexibleAppStorage.getLayout();
        FlexibleAppStorage.AccountContext storage ctx = $.contexts[account];

        if (!ctx.isInstalled) {
            NotInstalled.selector.revertWith();
        }

        bytes32 oldAppId = ctx.currentAppId;

        if (oldAppId == newAppId) {
            return; // Already on this version
        }

        FlexibleAppStorage.Metadata storage metadata = $.appMetadata[newAppId];

        ctx.currentAppId = newAppId;
        ctx.expiresAt = _calcExpiration(newAppId, metadata.accessDuration);

        emit AccountUpgraded(account, oldAppId, newAppId);
    }

    function _calcExpiration(bytes32 /* appId */, uint48 duration) internal view returns (uint48) {
        FlexibleAppStorage.AccountContext storage ctx = FlexibleAppStorage.getContext(msg.sender);
        uint48 currentExpiration = ctx.expiresAt;

        if (currentExpiration > block.timestamp) {
            return currentExpiration + duration;
        } else {
            return uint48(block.timestamp) + duration;
        }
    }
}
