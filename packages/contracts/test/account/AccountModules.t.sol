// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAccountModule} from "../../src/account/facets/IAccountModule.sol";

// libraries
import {Validator} from "../../src/utils/libraries/Validator.sol";

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
}
