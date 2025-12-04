// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// utils
import {BaseSetup} from "../spaces/BaseSetup.sol";

// interfaces

// libraries
import {ValidationConfigLib, ValidationConfig} from "@erc6900/reference-implementation/libraries/ValidationConfigLib.sol";
import {ModuleEntityLib, ModuleEntity} from "@erc6900/reference-implementation/libraries/ModuleEntityLib.sol";

// contracts
import {AccountFactory} from "modular-account/src/factory/AccountFactory.sol";
import {ExecutionInstallDelegate} from "modular-account/src/helpers/ExecutionInstallDelegate.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";
import {SemiModularAccountBytecode} from "modular-account/src/account/SemiModularAccountBytecode.sol";
import {SingleSignerValidationModule} from "modular-account/src/modules/validation/SingleSignerValidationModule.sol";

/// @title ERC6900Setup
/// @notice Base test setup for ERC-6900 modular account testing
abstract contract ERC6900Setup is BaseSetup {
    AccountFactory internal accountFactory;
    ExecutionInstallDelegate internal executionInstallDelegate;
    SingleSignerValidationModule internal singleSignerValidationModule;

    uint32 internal nextEntityId = 1;

    function setUp() public virtual override {
        super.setUp();

        executionInstallDelegate = new ExecutionInstallDelegate();
        singleSignerValidationModule = new SingleSignerValidationModule();

        ModularAccount accountImpl = new ModularAccount(entryPoint, executionInstallDelegate);
        SemiModularAccountBytecode semiModularImpl = new SemiModularAccountBytecode(
            entryPoint,
            executionInstallDelegate
        );

        accountFactory = new AccountFactory(
            entryPoint,
            accountImpl,
            semiModularImpl,
            address(singleSignerValidationModule),
            address(singleSignerValidationModule),
            deployer
        );
    }

    /// @notice Creates a new modular account
    function _createAccount(address owner, uint256 balance) internal returns (ModularAccount) {
        ModularAccount account = accountFactory.createAccount(owner, 0, nextEntityId++);
        if (balance > 0) vm.deal(address(account), balance);
        return account;
    }

    /// @notice Installs a validation module on an account
    function _installValidation(
        ModularAccount account,
        address module,
        uint32 entityId,
        bytes4[] memory selectors,
        bytes memory installData
    ) internal {
        ValidationConfig config = ValidationConfigLib.pack(module, entityId, false, false, false);
        vm.prank(address(entryPoint));
        account.installValidation(config, selectors, installData, new bytes[](0));
    }

    /// @notice Uninstalls a validation module from an account
    function _uninstallValidation(
        ModularAccount account,
        address module,
        uint32 entityId,
        bytes memory uninstallData
    ) internal {
        ModuleEntity moduleEntity = ModuleEntityLib.pack(module, entityId);
        vm.prank(address(entryPoint));
        account.uninstallValidation(moduleEntity, uninstallData, new bytes[](0));
    }

    /// @notice Gets the next entity ID
    function _getNextEntityId() internal returns (uint32) {
        return nextEntityId++;
    }
}
