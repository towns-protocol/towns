// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";
import {IAccountModule} from "./IAccountModule.sol";
import {IExecutionModule, ExecutionManifest, ManifestExecutionFunction, ManifestExecutionHook} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IExecutionHookModule} from "@erc6900/reference-implementation/interfaces/IExecutionHookModule.sol";
import {IAppAccount} from "src/spaces/facets/account/IAppAccount.sol";

// libraries
import "./AccountModule.sol" as AccountModule;
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {Validator} from "src/utils/libraries/Validator.sol";

// contracts
import {ModuleBase} from "modular-account/src/modules/ModuleBase.sol";
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

contract AccountModuleFacet is
    IAccountModule,
    IModule,
    IExecutionModule,
    IExecutionHookModule,
    ModuleBase,
    OwnableBase,
    ReentrancyGuardTransient,
    Facet
{
    using CustomRevert for bytes4;

    uint256 internal constant _INVALID_USER_OP = 1;
    bytes4 internal constant _INVALID_SIGNATURE = 0xffffffff;

    /// @notice Initializes the facet when added to a Diamond
    function __AccountModuleFacet_init(
        address spaceFactory,
        address appRegistry
    ) external onlyInitializing {
        _addInterface(type(IModule).interfaceId);
        _addInterface(type(IAccountModule).interfaceId);
        _addInterface(type(IValidationModule).interfaceId);
        _addInterface(type(IExecutionModule).interfaceId);
        __AccountModuleFacet_init_unchained(spaceFactory, appRegistry);
    }

    function __AccountModuleFacet_init_unchained(
        address spaceFactory,
        address appRegistry
    ) internal {
        Validator.checkAddress(spaceFactory);
        Validator.checkAddress(appRegistry);
        AccountModule.Layout storage $ = AccountModule.getStorage();
        ($.spaceFactory, $.appRegistry) = (spaceFactory, appRegistry);
    }

    /// @inheritdoc IModule
    function onInstall(bytes calldata data) external override nonReentrant {
        address account = abi.decode(data, (address));
        Validator.checkAddress(account);

        if (account != msg.sender)
            AccountModule.AccountModule__InvalidAccount.selector.revertWith(account);

        AccountModule.Layout storage $ = AccountModule.getStorage();
        if ($.installed[account])
            AccountModule.AccountModule__AlreadyInitialized.selector.revertWith(account);

        $.installed[account] = true;
    }

    /// @inheritdoc IModule
    function onUninstall(bytes calldata data) external override nonReentrant {
        address account = abi.decode(data, (address));
        Validator.checkAddress(account);

        if (account != msg.sender)
            AccountModule.AccountModule__InvalidAccount.selector.revertWith(account);

        AccountModule.Layout storage $ = AccountModule.getStorage();
        if (!$.installed[account])
            AccountModule.AccountModule__NotInstalled.selector.revertWith(account);
        delete $.installed[account];
    }

    function setSpaceFactory(address spaceFactory) external onlyOwner {
        Validator.checkAddress(spaceFactory);
        AccountModule.setSpaceFactory(spaceFactory);
    }

    function setAppRegistry(address appRegistry) external onlyOwner {
        Validator.checkAddress(appRegistry);
        AccountModule.setAppRegistry(appRegistry);
    }

    function getSpaceFactory() external view returns (address) {
        return AccountModule.getStorage().spaceFactory;
    }

    function getAppRegistry() external view returns (address) {
        return AccountModule.getStorage().appRegistry;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ERC-6900 MODULE                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IModule
    function moduleId() external pure returns (string memory) {
        return "towns.account-module.1.0.0";
    }

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        ACCOUNT MODULE                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function isInstalled(address account) external view returns (bool) {
        return AccountModule.getStorage().installed[account];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  VALIDATION MODULE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function preExecutionHook(
        uint32,
        address sender,
        uint256,
        bytes calldata
    ) external view returns (bytes memory) {
        if (sender != AccountModule.getStorage().appRegistry)
            AccountModule.AccountModule__InvalidCaller.selector.revertWith(sender);
        return "";
    }

    function postExecutionHook(uint32 entityId, bytes calldata preExecHookData) external {}
}
