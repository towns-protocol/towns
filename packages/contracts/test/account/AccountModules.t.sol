// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAccountModule} from "../../src/account/facets/IAccountModule.sol";
import {IModule} from "@erc6900/reference-implementation/interfaces/IModule.sol";
import {IValidationModule} from "@erc6900/reference-implementation/interfaces/IValidationModule.sol";

// libraries
import {Validator} from "../../src/utils/libraries/Validator.sol";
import {PackedUserOperation} from "@eth-infinitism/account-abstraction/interfaces/PackedUserOperation.sol";
import {ModuleInstallCommonsLib} from "modular-account/src/libraries/ModuleInstallCommonsLib.sol";
import "../../src/account/facets/AccountModule.sol" as AccountModule;

// deployments
import {DeployAccountModules} from "../../scripts/deployments/diamonds/DeployAccountModules.s.sol";

// contracts
import {AppRegistryBaseTest} from "../attest/AppRegistryBase.t.sol";
import {ERC6900Setup} from "./ERC6900Setup.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";

contract AccountModulesTest is AppRegistryBaseTest, ERC6900Setup {
    DeployAccountModules internal deployAccountModules;
    IAccountModule internal accountModules;

    function setUp() public override(AppRegistryBaseTest, ERC6900Setup) {
        super.setUp();

        deployAccountModules = new DeployAccountModules();
        deployAccountModules.setDependencies(spaceFactory, appRegistry);
        address mod = deployAccountModules.deploy(deployer);

        accountModules = IAccountModule(mod);
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

        bytes4[] memory selectors = new bytes4[](0);

        _installValidation(
            userAccount,
            address(accountModules),
            nextEntityId,
            selectors,
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));
    }

    function test_onUninstall(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);

        bytes4[] memory selectors = new bytes4[](0);

        _installValidation(
            userAccount,
            address(accountModules),
            nextEntityId,
            selectors,
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));

        // Note: onUninstall is only called if uninstallData.length > 0
        _uninstallValidation(userAccount, address(accountModules), nextEntityId, abi.encode(1));

        assertFalse(accountModules.isInstalled(address(userAccount)));
    }

    function test_onInstall_revertWhen_ZeroAddress(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);

        bytes4[] memory selectors = new bytes4[](0);

        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                address(accountModules),
                abi.encodeWithSelector(Validator.InvalidAddress.selector)
            )
        );
        _installValidation(
            userAccount,
            address(accountModules),
            nextEntityId,
            selectors,
            abi.encode(address(0))
        );
    }

    function test_onInstall_revertWhen_InvalidAccount(address user, address wrongAccount) external {
        vm.assume(wrongAccount != address(0));
        ModularAccount userAccount = _createAccount(user, 0);
        vm.assume(wrongAccount != address(userAccount));

        bytes4[] memory selectors = new bytes4[](0);

        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                address(accountModules),
                abi.encodeWithSelector(
                    AccountModule.AccountModule__InvalidAccount.selector,
                    wrongAccount
                )
            )
        );
        _installValidation(
            userAccount,
            address(accountModules),
            nextEntityId,
            selectors,
            abi.encode(wrongAccount)
        );
    }

    function test_onInstall_revertWhen_AlreadyInitialized(address user) external {
        ModularAccount userAccount = _createAccount(user, 0);

        bytes4[] memory selectors = new bytes4[](0);

        _installValidation(
            userAccount,
            address(accountModules),
            nextEntityId,
            selectors,
            abi.encode(address(userAccount))
        );

        assertTrue(accountModules.isInstalled(address(userAccount)));

        vm.expectRevert(
            abi.encodeWithSelector(
                ModuleInstallCommonsLib.ModuleInstallCallbackFailed.selector,
                address(accountModules),
                abi.encodeWithSelector(
                    AccountModule.AccountModule__AlreadyInitialized.selector,
                    address(userAccount)
                )
            )
        );
        _installValidation(
            userAccount,
            address(accountModules),
            nextEntityId + 1,
            selectors,
            abi.encode(address(userAccount))
        );
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
    /*                  VALIDATION MODULE TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_validateUserOp_returnsOne() external {
        PackedUserOperation memory userOp;
        uint256 result = IValidationModule(address(accountModules)).validateUserOp(
            0,
            userOp,
            bytes32(0)
        );
        assertEq(result, 1);
    }

    function test_validateSignature_returnsInvalidSelector() external view {
        bytes4 result = IValidationModule(address(accountModules)).validateSignature(
            address(0),
            0,
            address(0),
            bytes32(0),
            new bytes(0)
        );
        assertEq(result, bytes4(0xffffffff));
    }

    function test_validateRuntime_succeedsWhen_SenderIsThis() external {
        IValidationModule(address(accountModules)).validateRuntime(
            address(0),
            0,
            address(accountModules),
            0,
            new bytes(0),
            new bytes(0)
        );
    }

    function test_validateRuntime_revertWhen_InvalidSender(address sender) external {
        vm.assume(sender != address(accountModules));

        vm.expectRevert(
            abi.encodeWithSelector(AccountModule.AccountModule__InvalidSender.selector, sender)
        );
        IValidationModule(address(accountModules)).validateRuntime(
            address(0),
            0,
            sender,
            0,
            new bytes(0),
            new bytes(0)
        );
    }
}
