// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {PluginStorage} from "./PluginStorage.sol";
import {
    ExecutionStorage,
    toSetValue
} from "@erc6900/reference-implementation/src/account/AccountStorage.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/src/interfaces/IERC6900Account.sol";
import {HookConfig} from "@erc6900/reference-implementation/src/interfaces/IERC6900Account.sol";
import {
    ExecutionManifest,
    ManifestExecutionHook
} from "@erc6900/reference-implementation/src/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/src/interfaces/IERC6900Module.sol";
import {HookConfigLib} from "@erc6900/reference-implementation/src/libraries/HookConfigLib.sol";
import {KnownSelectorsLib} from
    "@erc6900/reference-implementation/src/libraries/KnownSelectorsLib.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// libraries

library PluginLib {
    using CustomRevert for bytes4;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using LibCall for address;

    error NullModule();
    error ExecutionFunctionAlreadySet();
    error NativeFunctionNotAllowed();
    error IModuleFunctionNotAllowed();
    error Erc4337FunctionNotAllowed();
    error ExecutionHookAlreadySet();
    error ModuleInstallCallbackFailed();
    error UnrecognizedFunction();
    error Unauthorized();

    function execModule(bytes4 selector, bytes calldata data) internal returns (bytes memory) {
        address plugin = PluginStorage.getLayout().executionStorage[selector].module;
        if (plugin == address(0)) UnrecognizedFunction.selector.revertWith();
        if (plugin != msg.sender) Unauthorized.selector.revertWith();

        bytes4 providedSelector;
        assembly {
            providedSelector := calldataload(data.offset)
        }

        if (providedSelector != selector) UnrecognizedFunction.selector.revertWith();

        return LibCall.callContract(plugin, data);
    }

    function installExecution(
        address plugin,
        ExecutionManifest calldata manifest,
        bytes calldata moduleInstallData
    )
        internal
    {
        if (plugin == address(0)) {
            NullModule.selector.revertWith();
        }

        uint256 len = manifest.executionFunctions.length;
        for (uint256 i; i < len; ++i) {
            bytes4 selector = manifest.executionFunctions[i].executionSelector;
            bool skipRuntimeValidation = manifest.executionFunctions[i].skipRuntimeValidation;
            bool allowGlobalValidation = manifest.executionFunctions[i].allowGlobalValidation;
            _setExecutionFunction(selector, skipRuntimeValidation, allowGlobalValidation, plugin);
        }

        PluginStorage.Layout storage db = PluginStorage.getLayout();

        len = manifest.executionHooks.length;
        for (uint256 i; i < len; ++i) {
            ManifestExecutionHook calldata hook = manifest.executionHooks[i];
            EnumerableSet.Bytes32Set storage execHooks =
                db.executionStorage[hook.executionSelector].executionHooks;

            HookConfig hookConfig = HookConfigLib.packExecHook({
                _module: plugin,
                _entityId: hook.entityId,
                _hasPre: hook.isPreHook,
                _hasPost: hook.isPostHook
            });

            _addExecHooks(execHooks, hookConfig);
        }

        // TODO: should we add interfaceIds

        _onInstall(plugin, moduleInstallData);

        emit IERC6900Account.ExecutionInstalled(plugin, manifest);
    }

    function _onInstall(address plugin, bytes calldata data) internal {
        if (data.length > 0) {
            bytes memory callData = abi.encodeWithSelector(IERC6900Module.onInstall.selector, data);
            LibCall.callContract(plugin, callData);
        }
    }

    function _addExecHooks(
        EnumerableSet.Bytes32Set storage hooks,
        HookConfig hookConfig
    )
        internal
    {
        if (!hooks.add(toSetValue(hookConfig))) {
            ExecutionHookAlreadySet.selector.revertWith();
        }
    }

    function _setExecutionFunction(
        bytes4 selector,
        bool skipRuntimeValidation,
        bool allowGlobalValidation,
        address module
    )
        internal
    {
        ExecutionStorage storage db = PluginStorage.getLayout().executionStorage[selector];

        if (db.module != address(0)) {
            ExecutionFunctionAlreadySet.selector.revertWith();
        }

        // Make sure incoming execution function does not collide with any native functions (data
        // are stored on the
        // account implementation contract)
        if (KnownSelectorsLib.isNativeFunction(selector)) {
            NativeFunctionNotAllowed.selector.revertWith();
        }

        // Make sure incoming execution function is not a function in IERC6900Module
        if (KnownSelectorsLib.isIModuleFunction(selector)) {
            IModuleFunctionNotAllowed.selector.revertWith();
        }

        // Also make sure it doesn't collide with functions defined by ERC-4337
        // and called by the entry point. This prevents a malicious module from
        // sneaking in a function with the same selector as e.g.
        // `validatePaymasterUserOp` and turning the account into their own
        // personal paymaster.
        if (KnownSelectorsLib.isErc4337Function(selector)) {
            Erc4337FunctionNotAllowed.selector.revertWith();
        }

        db.module = module;
        db.skipRuntimeValidation = skipRuntimeValidation;
        db.allowGlobalValidation = allowGlobalValidation;
    }
}
