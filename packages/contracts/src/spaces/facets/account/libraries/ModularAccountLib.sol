// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IModularAccountBase} from "../interfaces/IModularAccount.sol";
import {IModuleRegistry} from "src/modules/interfaces/IModuleRegistry.sol";
import {ITownsApp} from "src/modules/interfaces/ITownsApp.sol";
import {IERC6900Module} from "@erc6900/reference-implementation/interfaces/IERC6900Module.sol";
import {IERC6900ExecutionModule} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {MembershipStorage} from "src/spaces/facets/membership/MembershipStorage.sol";
import {ExecutorLib} from "src/spaces/facets/account/libraries/ExecutorLib.sol";
import {HookLib} from "src/spaces/facets/account/libraries/HookLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {DependencyLib} from "../../DependencyLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// types
import {ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";

library ModularAccountLib {
    using CustomRevert for bytes4;

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) internal returns (bytes memory result, uint32 nonce) {
        if (target == address(0)) IModularAccountBase.InvalidModuleAddress.selector.revertWith();
        if (IModuleRegistry(DependencyLib.getDependency("AppRegistry")).isModuleBanned(target))
            IModularAccountBase.InvalidModuleId.selector.revertWith();
        return ExecutorLib.execute(target, value, data);
    }

    function installModule(
        bytes32 versionId,
        uint32 grantDelay,
        uint32 executionDelay,
        uint256 allowance,
        bytes calldata postInstallData
    ) internal {
        if (versionId == EMPTY_UID) IModularAccountBase.InvalidModuleId.selector.revertWith();

        // get the module group id from the module registry
        (
            address module,
            ,
            address[] memory clients,
            ,
            ExecutionManifest memory cachedManifest
        ) = getModule(versionId);

        // verify if already installed
        if (ExecutorLib.isGroupActive(versionId))
            IModularAccountBase.ModuleAlreadyInstalled.selector.revertWith();

        verifyManifests(module, cachedManifest);

        ExecutorLib.createGroup(versionId);

        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            ExecutorLib.grantGroupAccess({
                groupId: versionId,
                account: clients[i],
                grantDelay: grantDelay > 0 ? grantDelay : ExecutorLib.getGroupGrantDelay(versionId),
                executionDelay: executionDelay > 0 ? executionDelay : 0
            });
        }

        // Set up execution functions with the same module groupId
        uint256 executionFunctionsLength = cachedManifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = cachedManifest.executionFunctions[i];

            // check if the function is a native function
            if (isInvalidSelector(func.executionSelector)) {
                IModularAccountBase.UnauthorizedSelector.selector.revertWith();
            }

            ExecutorLib.setTargetFunctionGroup(module, func.executionSelector, versionId);

            if (!func.allowGlobalValidation) {
                ExecutorLib.setTargetFunctionDisabled(module, func.executionSelector, true);
            }
        }

        // Set up hooks
        uint256 executionHooksLength = cachedManifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = cachedManifest.executionHooks[i];
            HookLib.addHook(
                module,
                hook.executionSelector,
                hook.entityId,
                hook.isPreHook,
                hook.isPostHook
            );
        }

        // Set the allowance for the module group
        if (allowance > 0) {
            if (address(this).balance < allowance)
                IModularAccountBase.NotEnoughEth.selector.revertWith();
            ExecutorLib.setGroupAllowance(versionId, allowance);
        }

        // Call module's onInstall if it has install data using LibCall
        // revert if it fails
        if (postInstallData.length > 0) {
            bytes memory callData = abi.encodeCall(IERC6900Module.onInstall, (postInstallData));
            LibCall.callContract(module, 0, callData);
        }

        emit IERC6900Account.ExecutionInstalled(module, cachedManifest);
    }

    function uninstallModule(bytes32 versionId, bytes calldata uninstallData) internal {
        (
            address module,
            ,
            address[] memory clients,
            ,
            ExecutionManifest memory manifest
        ) = getModule(versionId);

        // Remove hooks first
        uint256 executionHooksLength = manifest.executionHooks.length;
        for (uint256 i; i < executionHooksLength; ++i) {
            ManifestExecutionHook memory hook = manifest.executionHooks[i];
            HookLib.removeHook(module, hook.executionSelector, hook.entityId);
        }

        // Remove function group mappings
        uint256 executionFunctionsLength = manifest.executionFunctions.length;
        for (uint256 i; i < executionFunctionsLength; ++i) {
            ManifestExecutionFunction memory func = manifest.executionFunctions[i];
            // Set the group to 0 to remove the mapping
            ExecutorLib.setTargetFunctionGroup(module, func.executionSelector, EMPTY_UID);
        }

        // Revoke module's group access
        uint256 clientsLength = clients.length;
        for (uint256 i; i < clientsLength; ++i) {
            ExecutorLib.revokeGroupAccess(versionId, clients[i]);
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

    function setModuleAllowance(bytes32 versionId, uint256 allowance) internal {
        if (versionId == EMPTY_UID) IModularAccountBase.InvalidModuleId.selector.revertWith();
        if (!ExecutorLib.isGroupActive(versionId))
            IModularAccountBase.ModuleNotInstalled.selector.revertWith();
        ExecutorLib.setGroupAllowance(versionId, allowance);
    }

    function getModuleAllowance(bytes32 versionId) internal view returns (uint256) {
        if (versionId == EMPTY_UID) IModularAccountBase.InvalidModuleId.selector.revertWith();
        if (!ExecutorLib.isGroupActive(versionId))
            IModularAccountBase.ModuleNotInstalled.selector.revertWith();
        return ExecutorLib.getGroupAllowance(versionId);
    }

    // Getters
    function isEntitled(
        bytes32 versionId,
        address client,
        bytes32 permission
    ) internal view returns (bool) {
        (, , address[] memory clients, bytes32[] memory permissions, ) = getModule(versionId);

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

    function getModule(
        bytes32 versionId
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
        address appRegistry = DependencyLib.getDependency("AppRegistry");
        Attestation memory att = IModuleRegistry(appRegistry).getModuleById(versionId);

        if (att.uid == EMPTY_UID) IModularAccountBase.ModuleNotRegistered.selector.revertWith();
        if (att.revocationTime != 0) IModularAccountBase.ModuleRevoked.selector.revertWith();

        (module, owner, clients, permissions, manifest) = abi.decode(
            att.data,
            (address, address, address[], bytes32[], ExecutionManifest)
        );
    }

    // Checks
    function checkAuthorized(address module) internal view {
        if (module == address(0)) IModularAccountBase.InvalidModuleAddress.selector.revertWith();

        address factory = MembershipStorage.layout().spaceFactory;

        bytes32[] memory dependencies = new bytes32[](4);
        dependencies[0] = bytes32("RiverAirdrop");
        dependencies[1] = bytes32("SpaceOperator"); // BaseRegistry
        dependencies[2] = bytes32("ModuleRegistry");
        dependencies[3] = bytes32("AppRegistry");
        address[] memory deps = DependencyLib.getDependencies(dependencies);

        // Unauthorized targets
        if (
            module == factory ||
            module == deps[0] ||
            module == deps[1] ||
            module == deps[2] ||
            module == deps[3]
        ) {
            IModularAccountBase.UnauthorizedModule.selector.revertWith(module);
        }
    }

    function verifyManifests(
        address module,
        ExecutionManifest memory cachedManifest
    ) internal pure {
        ExecutionManifest memory moduleManifest = ITownsApp(module).executionManifest();

        // Hash all cached and latest manifests and compare
        bytes32 moduleManifestHash = keccak256(abi.encode(moduleManifest));
        bytes32 cachedManifestHash = keccak256(abi.encode(cachedManifest));

        if (moduleManifestHash != cachedManifestHash) {
            IModularAccountBase.InvalidManifest.selector.revertWith(module);
        }
    }

    function isInvalidSelector(bytes4 selector) internal pure returns (bool) {
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
}
