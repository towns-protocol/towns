// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAccountModule} from "../../src/account/facets/IAccountModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {IExecutionModule} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";
import {IAppAccount} from "../../src/spaces/facets/account/IAppAccount.sol";
import {ExecutionInstallDelegate} from "modular-account/src/helpers/ExecutionInstallDelegate.sol";

// libraries
import {Validator} from "../../src/utils/libraries/Validator.sol";
import {ModuleInstallCommonsLib} from "modular-account/src/libraries/ModuleInstallCommonsLib.sol";
import "../../src/account/facets/AccountModule.sol" as AccountModule;

// deployments
import {DeployAccountModules} from "../../scripts/deployments/diamonds/DeployAccountModules.s.sol";

// contracts
import {AppRegistryBaseTest} from "../attest/AppRegistryBase.t.sol";
import {ERC6900Setup} from "./ERC6900Setup.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";
import {ITownsApp} from "../../src/apps/ITownsApp.sol";

contract AccountModulesTest is AppRegistryBaseTest, ERC6900Setup {
    DeployAccountModules internal deployAccountModules;
    IAccountModule internal accountModules;
    IExecutionModule internal executionModule;

    function setUp() public override(AppRegistryBaseTest, ERC6900Setup) {
        super.setUp();

        deployAccountModules = new DeployAccountModules();
        deployAccountModules.setDependencies(spaceFactory, appRegistry);
        address mod = deployAccountModules.deploy(deployer);

        accountModules = IAccountModule(mod);
        executionModule = IExecutionModule(mod);
    }

    function _manifest() internal view returns (ExecutionManifest memory) {
        return executionModule.executionManifest();
    }

    function test_init_setsSpaceFactory() external view {
        assertNotEq(accountModules.getSpaceFactory(), address(0));
        assertEq(accountModules.getSpaceFactory(), spaceFactory);
    }

    function test_init_setsAppRegistry() external view {
        assertNotEq(accountModules.getAppRegistry(), address(0));
        assertEq(accountModules.getAppRegistry(), appRegistry);
    }

    function test_setSpaceFactory(address newFactory) public {
        vm.assume(newFactory != address(0));

        vm.prank(deployer);
        accountModules.setSpaceFactory(newFactory);

        assertEq(accountModules.getSpaceFactory(), newFactory);
    }

    function test_setSpaceFactory_revertWhen_NotOwner(address caller, address newFactory) public {
        vm.assume(caller != deployer);
        vm.assume(newFactory != address(0));

        vm.expectRevert();
        vm.prank(caller);
        accountModules.setSpaceFactory(newFactory);
    }

    function test_setSpaceFactory_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        accountModules.setSpaceFactory(address(0));
    }

    function test_setAppRegistry(address newRegistry) public {
        vm.assume(newRegistry != address(0));

        vm.prank(deployer);
        accountModules.setAppRegistry(newRegistry);

        assertEq(accountModules.getAppRegistry(), newRegistry);
    }

    function test_setAppRegistry_revertWhen_NotOwner(address caller, address newRegistry) public {
        vm.assume(caller != deployer);
        vm.assume(newRegistry != address(0));

        vm.expectRevert();
        vm.prank(caller);
        accountModules.setAppRegistry(newRegistry);
    }

    function test_setAppRegistry_revertWhen_ZeroAddress() public {
        vm.expectRevert(Validator.InvalidAddress.selector);
        vm.prank(deployer);
        accountModules.setAppRegistry(address(0));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           INSTALL TESTS                               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onInstall(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);

        _installExecution(
            userAccount,
            address(executionModule),
            _manifest(),
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));
    }

    function test_onInstall_revertWhen_ZeroAddress(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = _manifest();

        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                address(executionModule),
                abi.encodeWithSelector(Validator.InvalidAddress.selector)
            )
        );
        _installExecution(userAccount, address(executionModule), m, abi.encode(address(0)));
    }

    function test_onInstall_revertWhen_InvalidAccount(address user, address wrongAccount) external {
        vm.assume(wrongAccount != address(0));
        ModularAccount userAccount = _createAccount(user, 0);
        vm.assume(wrongAccount != address(userAccount));
        ExecutionManifest memory m = _manifest();

        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                address(executionModule),
                abi.encodeWithSelector(
                    AccountModule.AccountModule__InvalidAccount.selector,
                    wrongAccount
                )
            )
        );
        _installExecution(userAccount, address(executionModule), m, abi.encode(wrongAccount));
    }

    function test_onInstall_revertWhen_AlreadyInitialized(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = _manifest();

        _installExecution(
            userAccount,
            address(executionModule),
            m,
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));

        // Installing the same execution module again fails with ExecutionFunctionAlreadySet
        // because the execution function selector is already registered
        vm.expectRevert(
            abi.encodeWithSelector(
                ExecutionInstallDelegate.ExecutionFunctionAlreadySet.selector,
                IAppAccount.onInstallApp.selector
            )
        );
        _installExecution(
            userAccount,
            address(executionModule),
            m,
            abi.encode(address(userAccount))
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        UNINSTALL TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onUninstall(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);

        _installExecution(
            userAccount,
            address(executionModule),
            _manifest(),
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));

        // Note: onUninstall is only called if uninstallData.length > 0
        // so we need to pass a non-empty uninstallData
        // Pass the account address as expected by onUninstall
        _uninstallExecution(
            userAccount,
            address(executionModule),
            _manifest(),
            abi.encode(address(userAccount))
        );

        assertFalse(accountModules.isInstalled(address(userAccount)));
    }

    function test_onUninstall_failsIfNotInstalled(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = _manifest();

        // Do NOT install execution

        // Uninstalling non-installed execution fails with ExecutionFunctionNotSet
        vm.expectRevert(
            abi.encodeWithSelector(
                ExecutionInstallDelegate.ExecutionFunctionNotSet.selector,
                IAppAccount.onInstallApp.selector
            )
        );
        _uninstallExecution(userAccount, address(executionModule), m, abi.encode(1));

        // Module was never installed, so isInstalled should still be false
        assertFalse(accountModules.isInstalled(address(userAccount)));
    }

    function test_onUninstall_failsIfInvalidAccount(address user, address notAccount) external {
        // Use an account that is not the caller (userAccount)
        vm.assume(notAccount != address(0));
        ModularAccount userAccount = _createAccount(user, 0);
        vm.assume(notAccount != address(userAccount));
        ExecutionManifest memory m = _manifest();

        _installExecution(
            userAccount,
            address(executionModule),
            m,
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));

        // onUninstall callback fails but doesn't revert - uninstall completes with failure
        vm.expectEmit(address(userAccount));
        emit IModularAccount.ExecutionUninstalled(address(executionModule), false, m);

        // uninstallData encoded as an address that is not account
        // _uninstallExecution will call as userAccount (account), but facet will decode 'notAccount'
        _uninstallExecution(userAccount, address(executionModule), m, abi.encode(notAccount));

        // Since callback failed, installed flag should remain true
        assertTrue(accountModules.isInstalled(address(userAccount)));
    }

    function test_onUninstall_actuallyDeletesInstalledFlag(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);
        ExecutionManifest memory m = _manifest();

        _installExecution(
            userAccount,
            address(executionModule),
            m,
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));

        _uninstallExecution(
            userAccount,
            address(executionModule),
            m,
            abi.encode(address(userAccount))
        );

        assertFalse(accountModules.isInstalled(address(userAccount)));

        // Trying to uninstall again fails with ExecutionFunctionNotSet since
        // execution function was already removed
        vm.expectRevert(
            abi.encodeWithSelector(
                ExecutionInstallDelegate.ExecutionFunctionNotSet.selector,
                IAppAccount.onInstallApp.selector
            )
        );
        _uninstallExecution(
            userAccount,
            address(executionModule),
            m,
            abi.encode(address(userAccount))
        );

        // Still uninstalled
        assertFalse(accountModules.isInstalled(address(userAccount)));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        MODULE ID TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_moduleId() external view {
        assertEq(IModule(address(accountModules)).moduleId(), "towns.account-module.1.0.0");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      IS INSTALLED TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_isInstalled_returnsFalse_whenNotInstalled(address account) external view {
        assertFalse(accountModules.isInstalled(account));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    APP MANAGER TESTS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_onInstallApp(address user) external givenSimpleAppIsRegistered {
        ModularAccount userAccount = _createAccount(user, 0);

        _installExecution(
            userAccount,
            address(executionModule),
            _manifest(),
            abi.encode(address(userAccount))
        );

        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        IAppAccount appAccount = IAppAccount(address(userAccount));

        uint256 totalPrice = registry.getAppPrice(address(appContract));

        hoax(address(userAccount), totalPrice);
        installer.installApp{value: totalPrice}(appContract, appAccount, "");

        assertTrue(appAccount.isAppInstalled(address(appContract)));
    }
}
