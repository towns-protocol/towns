// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";
import {IAccountHub} from "./IAccountHub.sol";
import {IExecutionModule, ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IExecutionHookModule} from "@erc6900/reference-implementation/interfaces/IExecutionHookModule.sol";
import {IAppAccount} from "../../../spaces/facets/account/IAppAccount.sol";

// libraries
import {AccountHubMod} from "./AccountHubMod.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

// contracts
import {ModuleBase} from "modular-account/src/modules/ModuleBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

contract AccountHubFacet is
    IAccountHub,
    IModule,
    IExecutionModule,
    IExecutionHookModule,
    ModuleBase,
    OwnableBase,
    ReentrancyGuardTransient,
    Facet
{
    using CustomRevert for bytes4;
    using AccountHubMod for AccountHubMod.Layout;

    /// @notice Initializes the facet when added to a Diamond
    function __AccountHubFacet_init(
        address spaceFactory,
        address appRegistry
    ) external onlyInitializing {
        _addInterface(type(IModule).interfaceId);
        _addInterface(type(IAccountHub).interfaceId);
        _addInterface(type(IValidationModule).interfaceId);
        _addInterface(type(IExecutionModule).interfaceId);
        __AccountHubFacet_init_unchained(spaceFactory, appRegistry);
    }

    /// @inheritdoc IModule
    function onInstall(bytes calldata data) external override nonReentrant {
        address account = abi.decode(data, (address));
        AccountHubMod.getStorage().installAccount(account);
    }

    /// @inheritdoc IModule
    function onUninstall(bytes calldata data) external override nonReentrant {
        address account = abi.decode(data, (address));
        AccountHubMod.getStorage().uninstallAccount(account);
    }

    /// @inheritdoc IAccountHub
    function setSpaceFactory(address spaceFactory) external onlyOwner {
        AccountHubMod.getStorage().setSpaceFactory(spaceFactory);
    }

    /// @inheritdoc IAccountHub
    function setAppRegistry(address appRegistry) external onlyOwner {
        AccountHubMod.getStorage().setAppRegistry(appRegistry);
    }

    /// @inheritdoc IExecutionHookModule
    // solhint-disable-next-line no-empty-blocks
    function postExecutionHook(uint32, bytes calldata) external override {}

    /// @inheritdoc IAccountHub
    function getSpaceFactory() external view returns (address) {
        return AccountHubMod.getStorage().spaceFactory;
    }

    /// @inheritdoc IAccountHub
    function getAppRegistry() external view returns (address) {
        return AccountHubMod.getStorage().appRegistry;
    }

    /// @inheritdoc IAccountHub
    function isInstalled(address account) external view returns (bool) {
        return AccountHubMod.getStorage().isInstalled(account);
    }

    /// @inheritdoc IExecutionHookModule
    function preExecutionHook(
        uint32,
        address sender,
        uint256,
        bytes calldata
    ) external view returns (bytes memory) {
        AccountHubMod.getStorage().onlyRegistry(sender);
        return "";
    }

    /// @inheritdoc IModule
    function moduleId() external pure returns (string memory) {
        return "towns.account-module.1.0.0";
    }

    // solhint-disable-next-line function-max-lines
    function executionManifest() external pure returns (ExecutionManifest memory) {
        bool allowGlobalValidation = false;
        bool skipRuntimeValidation = true;

        ManifestExecutionFunction[] memory executionFunctions = new ManifestExecutionFunction[](11);
        executionFunctions[0] = ManifestExecutionFunction({
            executionSelector: IAppAccount.onInstallApp.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[1] = ManifestExecutionFunction({
            executionSelector: IAppAccount.onUninstallApp.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[2] = ManifestExecutionFunction({
            executionSelector: IAppAccount.onRenewApp.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[3] = ManifestExecutionFunction({
            executionSelector: IAppAccount.onUpdateApp.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[4] = ManifestExecutionFunction({
            executionSelector: IAppAccount.enableApp.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[5] = ManifestExecutionFunction({
            executionSelector: IAppAccount.disableApp.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[6] = ManifestExecutionFunction({
            executionSelector: IAppAccount.isAppInstalled.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[7] = ManifestExecutionFunction({
            executionSelector: IAppAccount.getAppId.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[8] = ManifestExecutionFunction({
            executionSelector: IAppAccount.getAppExpiration.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[9] = ManifestExecutionFunction({
            executionSelector: IAppAccount.isAppEntitled.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        executionFunctions[10] = ManifestExecutionFunction({
            executionSelector: IAppAccount.getInstalledApps.selector,
            skipRuntimeValidation: skipRuntimeValidation,
            allowGlobalValidation: allowGlobalValidation
        });

        ManifestExecutionHook[] memory executionHooks = new ManifestExecutionHook[](4);

        executionHooks[0] = ManifestExecutionHook({
            executionSelector: IAppAccount.onInstallApp.selector,
            entityId: 1,
            isPreHook: true,
            isPostHook: false
        });

        executionHooks[1] = ManifestExecutionHook({
            executionSelector: IAppAccount.onUninstallApp.selector,
            entityId: 2,
            isPreHook: true,
            isPostHook: false
        });

        executionHooks[2] = ManifestExecutionHook({
            executionSelector: IAppAccount.onRenewApp.selector,
            entityId: 3,
            isPreHook: true,
            isPostHook: false
        });

        executionHooks[3] = ManifestExecutionHook({
            executionSelector: IAppAccount.onUpdateApp.selector,
            entityId: 4,
            isPreHook: true,
            isPostHook: false
        });

        bytes4[] memory interfaceIds = new bytes4[](1);
        interfaceIds[0] = type(IAppAccount).interfaceId;

        return
            ExecutionManifest({
                executionFunctions: executionFunctions,
                executionHooks: executionHooks,
                interfaceIds: interfaceIds
            });
    }

    function __AccountHubFacet_init_unchained(address spaceFactory, address appRegistry) internal {
        Validator.checkAddress(spaceFactory);
        Validator.checkAddress(appRegistry);
        AccountHubMod.Layout storage $ = AccountHubMod.getStorage();
        ($.spaceFactory, $.appRegistry) = (spaceFactory, appRegistry);
    }
}
