// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppAccountBase} from "./IAppAccount.sol";
import {IAppRegistry} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {DependencyLib} from "../DependencyLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";
import {AppAccountStorage} from "./AppAccountStorage.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// types
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts
import {ExecutorBase} from "../executor/ExecutorBase.sol";
import {HookBase} from "../executor/hooks/HookBase.sol";
import {TokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/TokenOwnableBase.sol";

abstract contract AppAccountBase is IAppAccountBase, TokenOwnableBase, ExecutorBase, HookBase {
    using CustomRevert for bytes4;
    using DependencyLib for MembershipStorage.Layout;
    using SafeTransferLib for address;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    function _installApp(
        bytes32 appId,
        Delays calldata delays,
        Allowance[] calldata allowances,
        bytes calldata postInstallData
    ) internal {
        if (appId == EMPTY_UID) InvalidAppId.selector.revertWith();

        // get the module group id from the module registry
        (
            address module,
            ,
            address[] memory clients,
            ,
            ExecutionManifest memory cachedManifest
        ) = _getApp(appId);

        // verify if already installed
        if (_isGroupActive(appId)) AppAlreadyInstalled.selector.revertWith();

        _verifyManifests(module, cachedManifest);
        _createGroup(appId);

        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            _grantGroupAccess({
                groupId: appId,
                account: clients[i],
                grantDelay: delays.grantDelay > 0 ? delays.grantDelay : _getGroupGrantDelay(appId),
                executionDelay: delays.executionDelay > 0 ? delays.executionDelay : 0
            });
        }

        _setExecutionFunctions(module, appId, cachedManifest);
        _setHooks(module, cachedManifest.executionHooks);
        _setAllowances(module, appId, allowances);

        // Call module's onInstall if it has install data using LibCall
        // revert if it fails
        if (postInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (postInstallData));
            LibCall.callContract(module, 0, callData);
        }

        emit IERC6900Account.ExecutionInstalled(module, cachedManifest);
    }

    function _setExecutionFunctions(
        address module,
        bytes32 appId,
        ExecutionManifest memory manifest
    ) internal {
        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = manifest.executionFunctions[i];

            // check if the function is a native function
            if (_isInvalidSelector(func.executionSelector)) {
                UnauthorizedSelector.selector.revertWith();
            }

            _setTargetFunctionGroup(module, func.executionSelector, appId);

            if (!func.allowGlobalValidation) {
                _setTargetFunctionDisabled(module, func.executionSelector, true);
            }
        }
    }

    function _setHooks(address module, ManifestExecutionHook[] memory hooks) internal {
        // Set up hooks
        uint256 executionHooksLength = hooks.length;
        if (executionHooksLength == 0) return;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = hooks[i];
            _addHook(
                module,
                hook.executionSelector,
                hook.entityId,
                hook.isPreHook,
                hook.isPostHook
            );
        }
    }

    function _setAllowances(
        address module,
        bytes32 appId,
        Allowance[] calldata allowances
    ) internal {
        uint256 allowancesLength = allowances.length;
        for (uint256 i; i < allowancesLength; ++i) {
            Allowance memory allowance = allowances[i];
            _setAllowance(module, appId, allowance.token, allowance.allowance);
        }
    }

    function _uninstallApp(bytes32 appId, bytes calldata uninstallData) internal {
        (address module, , address[] memory clients, , ExecutionManifest memory manifest) = _getApp(
            appId
        );

        // Remove hooks first
        uint256 executionHooksLength = manifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = manifest.executionHooks[i];
            _removeHook(module, hook.executionSelector, hook.entityId);
        }

        // Remove function _group mappings
        uint256 executionFunctionsLength = manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = manifest.executionFunctions[i];
            // Set the group to 0 to remove the mapping
            _setTargetFunctionGroup(module, func.executionSelector, EMPTY_UID);
        }

        // Revoke module's group access
        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            _revokeGroupAccess(appId, clients[i]);
        }

        // Remove all allowances
        AppAccountStorage.Layout storage $ = AppAccountStorage.getLayout();
        EnumerableSetLib.AddressSet storage allowedTokens = $.allowedTokens[appId];
        for (uint256 i; i < allowedTokens.length(); ++i) {
            address token = allowedTokens.at(i);
            $.allowances[appId][token].allowance = 0;
            allowedTokens.remove(token);
            token.safeApprove(module, 0);
        }

        // Call module's onUninstall if uninstall data is provided
        // don't revert if it fails
        bool onUninstallSuccess = true;
        if (uninstallData.length > 0) {
            // solhint-disable-next-line no-empty-blocks
            try IERC6900Module(module).onUninstall(uninstallData) {} catch {
                onUninstallSuccess = false;
            }
        }

        emit IERC6900Account.ExecutionUninstalled(module, onUninstallSuccess, manifest);
    }

    // Getters
    function _isEntitled(
        bytes32 appId,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        (, , address[] memory clients, bytes32[] memory permissions, ) = _getApp(appId);

        uint256 clientsLength = clients.length;
        uint256 permissionsLength = permissions.length;

        // has to be both in the clients array and the permissions array
        bool isClient = false;
        for (uint256 i; i < clientsLength; ++i) {
            if (clients[i] == client) {
                isClient = true;
                break;
            }
        }

        if (!isClient) return false;

        for (uint256 i; i < permissionsLength; ++i) {
            if (permissions[i] == permission) {
                return true;
            }
        }

        return false;
    }

    function _getApp(
        bytes32 appId
    )
        internal
        view
        returns (
            address module,
            address owner,
            address[] memory clients,
            bytes32[] memory permissions,
            ExecutionManifest memory manifest
        )
    {
        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address appRegistry = ms.getDependency("AppRegistry");
        Attestation memory att = IAppRegistry(appRegistry).getAppById(appId);

        if (att.uid == EMPTY_UID) AppNotRegistered.selector.revertWith();
        if (att.revocationTime != 0) AppRevoked.selector.revertWith();

        (module, owner, clients, permissions, manifest) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
    }

    function _getTokenAllowance(bytes32 groupId, address token) internal view returns (uint256) {
        if (groupId == EMPTY_UID) InvalidAppId.selector.revertWith();
        if (!_isGroupActive(groupId)) AppNotInstalled.selector.revertWith();
        AppAccountStorage.Layout storage db = AppAccountStorage.getLayout();
        return db.allowances[groupId][token].allowance;
    }

    function _setTokenAllowance(bytes32 groupId, address token, uint256 allowance) internal {
        // Basic validation checks
        if (groupId == EMPTY_UID) InvalidAppId.selector.revertWith();
        if (!_isGroupActive(groupId)) AppNotInstalled.selector.revertWith();

        // Check if the token is a valid ERC20 contract
        if (token == address(0)) InvalidToken.selector.revertWith();

        // Prevent setting allowance to max uint256 to avoid potential overflow issues
        if (allowance == type(uint256).max) {
            allowance = type(uint256).max - 1;
        }

        // Get app information
        (address module, , , , ) = _getApp(groupId);
        if (module == address(0)) InvalidAppAddress.selector.revertWith();

        // Handle native ETH and ERC20 tokens differently
        _setAllowance(module, groupId, token, allowance);

        // Emit event for tracking
        emit TokenAllowanceSet(groupId, token, allowance, block.timestamp);
    }

    function _setAllowance(
        address module,
        bytes32 groupId,
        address token,
        uint256 allowance
    ) internal {
        AppAccountStorage.Layout storage $ = AppAccountStorage.getLayout();
        AppAccountStorage.TokenAllowance storage allowances = $.allowances[groupId][token];
        EnumerableSetLib.AddressSet storage allowedTokens = $.allowedTokens[groupId];

        // Update allowance
        allowances.allowance = allowance;
        allowances.lastUpdated = block.timestamp;

        // Handle native ETH and ERC20 tokens differently
        if (token == CurrencyTransfer.NATIVE_TOKEN) {
            if (allowance > address(this).balance) NotEnoughEth.selector.revertWith();
            _setGroupAllowance(groupId, allowance);
        } else {
            // Check token balance
            uint256 tokenBalance = token.balanceOf(address(this));
            if (allowance > tokenBalance) NotEnoughToken.selector.revertWith();

            // Set approval
            token.safeApprove(module, 0);
            if (allowance > 0) token.safeApprove(module, allowance);
        }

        allowedTokens.add(token);
    }

    // Checks
    function _checkAuthorized(address module) internal view {
        if (module == address(0)) InvalidAppAddress.selector.revertWith();

        MembershipStorage.Layout storage ms = MembershipStorage.layout();
        address factory = ms.spaceFactory;

        bytes32[] memory dependencies = new bytes32[](4);
        dependencies[0] = bytes32("RiverAirdrop");
        dependencies[1] = bytes32("SpaceOperator"); // BaseRegistry
        dependencies[2] = bytes32("ModuleRegistry");
        dependencies[3] = bytes32("AppRegistry");
        address[] memory deps = ms.getDependencies(dependencies);

        if (IAppRegistry(deps[3]).isAppBanned(module)) {
            UnauthorizedApp.selector.revertWith(module);
        }

        // Unauthorized targets
        if (
            module == factory ||
            module == deps[0] ||
            module == deps[1] ||
            module == deps[2] ||
            module == deps[3]
        ) {
            UnauthorizedApp.selector.revertWith(module);
        }
    }

    function _verifyManifests(
        address module,
        ExecutionManifest memory cachedManifest
    ) internal pure {
        ExecutionManifest memory moduleManifest = ITownsApp(module).executionManifest();

        // Hash all cached and latest manifests and compare
        bytes32 moduleManifestHash = keccak256(abi.encode(moduleManifest));
        bytes32 cachedManifestHash = keccak256(abi.encode(cachedManifest));

        if (moduleManifestHash != cachedManifestHash) {
            InvalidManifest.selector.revertWith(module);
        }
    }

    function _isInvalidSelector(bytes4 selector) internal pure returns (bool) {
        return
            selector == IERC6900Account.installExecution.selector ||
            selector == IERC6900Account.uninstallExecution.selector ||
            selector == IERC6900Account.installValidation.selector ||
            selector == IERC6900Account.uninstallValidation.selector ||
            selector == IERC6900Account.execute.selector ||
            selector == IERC6900Account.executeBatch.selector ||
            selector == IERC6900Account.executeWithRuntimeValidation.selector ||
            selector == IERC6900Account.accountId.selector ||
            selector == IERC165.supportsInterface.selector ||
            selector == IERC6900Module.moduleId.selector ||
            selector == IERC6900Module.onInstall.selector ||
            selector == IERC6900Module.onUninstall.selector ||
            selector == IERC6900ExecutionModule.executionManifest.selector ||
            selector == IDiamondCut.diamondCut.selector ||
            selector == ITownsApp.requiredPermissions.selector;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Hooks                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _getOwner() internal view virtual override returns (address) {
        return _owner();
    }

    function _executePreHooks(
        address target,
        bytes4 selector,
        uint256 value,
        bytes calldata data
    ) internal virtual override {
        _callPreHooks(target, selector, value, data);
    }

    function _executePostHooks(address target, bytes4 selector) internal virtual override {
        _callPostHooks(target, selector);
    }
}
