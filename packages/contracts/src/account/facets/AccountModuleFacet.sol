// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";
import {IAccountModule} from "./IAccountModule.sol";
import {IValidationHookModule} from "@erc6900/reference-implementation/interfaces/IValidationHookModule.sol";

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
    IValidationModule,
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
        _addInterface(type(IAccountModule).interfaceId);
        _addInterface(type(IValidationModule).interfaceId);
        _addInterface(type(IValidationHookModule).interfaceId);
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        ACCOUNT MODULE                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function isInstalled(address account) external view returns (bool) {
        return AccountModule.getStorage().installed[account];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  VALIDATION MODULE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IValidationModule
    function validateUserOp(
        uint32,
        PackedUserOperation calldata,
        bytes32
    ) external pure override returns (uint256) {
        return _INVALID_USER_OP;
    }

    /// @inheritdoc IValidationModule
    function validateSignature(
        address,
        uint32,
        address,
        bytes32,
        bytes calldata
    ) external pure override returns (bytes4) {
        return _INVALID_SIGNATURE;
    }

    /// @inheritdoc IValidationModule
    function validateRuntime(
        address,
        uint32,
        address sender,
        uint256,
        bytes calldata,
        bytes calldata
    ) external view override {
        if (sender != address(this))
            AccountModule.AccountModule__InvalidSender.selector.revertWith(sender);
    }
}
