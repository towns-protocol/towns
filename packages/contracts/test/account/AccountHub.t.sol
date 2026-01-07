// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IAppAccount} from "../../src/spaces/facets/account/IAppAccount.sol";
import {ExecutionInstallDelegate} from "modular-account/src/helpers/ExecutionInstallDelegate.sol";

// libraries
import {Validator} from "../../src/utils/libraries/Validator.sol";
import {ModuleInstallCommonsLib} from "modular-account/src/libraries/ModuleInstallCommonsLib.sol";
import {AccountHubMod} from "../../src/account/facets/hub/AccountHubMod.sol";

// deployments
import {DeployAccountModules} from "../../scripts/deployments/diamonds/DeployAccountModules.s.sol";

// contracts
import {AppRegistryBaseTest} from "../attest/AppRegistryBase.t.sol";
import {ERC6900Setup} from "./ERC6900Setup.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";
import {AccountHubFacet} from "../../src/account/facets/hub/AccountHubFacet.sol";

contract AccountHubTest is AppRegistryBaseTest, ERC6900Setup {
    DeployAccountModules internal deployAccountModules;

    AccountHubFacet internal accountHub;

    function setUp() public override(AppRegistryBaseTest, ERC6900Setup) {
        super.setUp();

        deployAccountModules = new DeployAccountModules();
        deployAccountModules.setDependencies(spaceFactory, appRegistry);
        address mod = deployAccountModules.deploy(deployer);

        accountHub = AccountHubFacet(mod);
    }

    function test_init_setsSpaceFactory() external view {
        assertNotEq(accountHub.getSpaceFactory(), address(0));
        assertEq(accountHub.getSpaceFactory(), spaceFactory);
    }

    function test_init_setsAppRegistry() external view {
        assertNotEq(accountHub.getAppRegistry(), address(0));
        assertEq(accountHub.getAppRegistry(), appRegistry);
    }

    function test_setSpaceFactory(address newFactory) public {
        vm.assume(newFactory != address(0));

        vm.prank(deployer);
        accountHub.setSpaceFactory(newFactory);

        assertEq(accountHub.getSpaceFactory(), newFactory);
    }

    function test_setSpaceFactory_revertWhen_NotOwner(address caller, address newFactory) public {
        vm.assume(caller != deployer);
        vm.assume(newFactory != address(0));

        vm.expectRevert();
        vm.prank(caller);
        accountHub.setSpaceFactory(newFactory);
    }

    function test_setSpaceFactory_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        accountHub.setSpaceFactory(address(0));
    }

    function test_setAppRegistry(address newRegistry) public {
        vm.assume(newRegistry != address(0));

        vm.prank(deployer);
        accountHub.setAppRegistry(newRegistry);

        assertEq(accountHub.getAppRegistry(), newRegistry);
    }

    function test_setAppRegistry_revertWhen_NotOwner(address caller, address newRegistry) public {
        vm.assume(caller != deployer);
        vm.assume(newRegistry != address(0));

        vm.expectRevert();
        vm.prank(caller);
        accountHub.setAppRegistry(newRegistry);
    }

    function test_setAppRegistry_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        accountHub.setAppRegistry(address(0));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           INSTALL TESTS                               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onInstall(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);

        _installExecution(
            userAccount,
            address(accountHub),
            accountHub.executionManifest(),
            abi.encode(address(userAccount))
        );

        assertTrue(accountHub.isInstalled(address(userAccount)));
    }

    function test_onInstall_revertWhen_ZeroAddress(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = accountHub.executionManifest();

        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                address(accountHub),
                abi.encodeWithSelector(Validator.InvalidAddress.selector)
            )
        );
        _installExecution(userAccount, address(accountHub), m, abi.encode(address(0)));
    }

    function test_onInstall_revertWhen_InvalidAccount(address user, address wrongAccount) external {
        vm.assume(wrongAccount != address(0));
        ModularAccount userAccount = _createAccount(user, 0);
        vm.assume(wrongAccount != address(userAccount));
        ExecutionManifest memory m = accountHub.executionManifest();

        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                address(accountHub),
                abi.encodeWithSelector(
                    AccountHubMod.AccountHub__InvalidAccount.selector,
                    wrongAccount
                )
            )
        );
        _installExecution(userAccount, address(accountHub), m, abi.encode(wrongAccount));
    }

    function test_onInstall_revertWhen_AlreadyInitialized(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = accountHub.executionManifest();

        _installExecution(userAccount, address(accountHub), m, abi.encode(address(userAccount)));

        assertTrue(accountHub.isInstalled(address(userAccount)));

        // Installing the same execution module again fails with ExecutionFunctionAlreadySet
        // because the execution function selector is already registered
        vm.expectRevert(
            abi.encodeWithSelector(
                ExecutionInstallDelegate.ExecutionFunctionAlreadySet.selector,
                IAppAccount.onInstallApp.selector
            )
        );
        _installExecution(userAccount, address(accountHub), m, abi.encode(address(userAccount)));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        UNINSTALL TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onUninstall(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);

        _installExecution(
            userAccount,
            address(accountHub),
            accountHub.executionManifest(),
            abi.encode(address(userAccount))
        );

        assertTrue(accountHub.isInstalled(address(userAccount)));

        // Note: onUninstall is only called if uninstallData.length > 0
        // so we need to pass a non-empty uninstallData
        // Pass the account address as expected by onUninstall
        _uninstallExecution(
            userAccount,
            address(accountHub),
            accountHub.executionManifest(),
            abi.encode(address(userAccount))
        );

        assertFalse(accountHub.isInstalled(address(userAccount)));
    }

    function test_onUninstall_failsIfNotInstalled(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = accountHub.executionManifest();

        // Uninstalling non-installed execution fails
        vm.expectRevert();
        _uninstallExecution(userAccount, address(accountHub), m, abi.encode(1));

        // Module was never installed, so isInstalled should still be false
        assertFalse(accountHub.isInstalled(address(userAccount)));
    }

    function test_onUninstall_failsIfInvalidAccount(address user, address notAccount) external {
        // Use an account that is not the caller (userAccount)
        vm.assume(notAccount != address(0));
        ModularAccount userAccount = _createAccount(user, 0);
        vm.assume(notAccount != address(userAccount));
        ExecutionManifest memory m = accountHub.executionManifest();

        _installExecution(userAccount, address(accountHub), m, abi.encode(address(userAccount)));

        assertTrue(accountHub.isInstalled(address(userAccount)));

        // onUninstall callback fails but doesn't revert - uninstall completes with failure
        vm.expectEmit(address(userAccount));
        emit IModularAccount.ExecutionUninstalled(address(accountHub), false, m);

        // uninstallData encoded as an address that is not account
        // _uninstallExecution will call as userAccount (account), but facet will decode 'notAccount'
        _uninstallExecution(userAccount, address(accountHub), m, abi.encode(notAccount));

        // Since callback failed, installed flag should remain true
        assertTrue(accountHub.isInstalled(address(userAccount)));
    }

    function test_onUninstall_actuallyDeletesInstalledFlag(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = accountHub.executionManifest();

        _installExecution(userAccount, address(accountHub), m, abi.encode(address(userAccount)));

        assertTrue(accountHub.isInstalled(address(userAccount)));

        _uninstallExecution(userAccount, address(accountHub), m, abi.encode(address(userAccount)));

        assertFalse(accountHub.isInstalled(address(userAccount)));

        // Trying to uninstall again fails with ExecutionFunctionNotSet since
        // execution function was already removed
        vm.expectRevert();
        _uninstallExecution(userAccount, address(accountHub), m, abi.encode(address(userAccount)));

        // Still uninstalled
        assertFalse(accountHub.isInstalled(address(userAccount)));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        MODULE ID TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_moduleId() external view {
        assertEq(IModule(address(accountHub)).moduleId(), "towns.account-module.1.0.0");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      IS INSTALLED TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_isInstalled_returnsFalse_whenNotInstalled(address account) external view {
        assertFalse(accountHub.isInstalled(account));
    }
}
