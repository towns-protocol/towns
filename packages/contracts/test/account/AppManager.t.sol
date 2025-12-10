// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IAppAccount} from "src/spaces/facets/account/IAppAccount.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IExecutionModule.sol";

// libraries

// contracts
import {ERC6900Setup} from "./ERC6900Setup.sol";
import {AppRegistryBaseTest} from "../attest/AppRegistryBase.t.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";
import {AccountHubFacet} from "../../src/account/facets/hub/AccountHubFacet.sol";
import {DeployAccountModules} from "../../scripts/deployments/diamonds/DeployAccountModules.s.sol";

contract AppManagerTest is AppRegistryBaseTest, ERC6900Setup {
    DeployAccountModules internal deployAccountModules;

    AccountHubFacet internal accountHub;

    function setUp() public override(AppRegistryBaseTest, ERC6900Setup) {
        super.setUp();

        deployAccountModules = new DeployAccountModules();
        deployAccountModules.setDependencies(spaceFactory, appRegistry);
        address mod = deployAccountModules.deploy(deployer);

        accountHub = AccountHubFacet(mod);
    }

    function _createAccountWithHubInstalled(address user) internal returns (address account) {
        ModularAccount userAccount = _createAccount(user, 0);
        _installExecution(
            userAccount,
            address(accountHub),
            accountHub.executionManifest(),
            abi.encode(address(userAccount))
        );
        return address(userAccount);
    }

    function test_installApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        uint256 totalPrice = registry.getAppPrice(address(appContract));

        hoax(account, totalPrice);
        installer.installApp{value: totalPrice}(appContract, IAppAccount(account), "");

        assertTrue(IAppAccount(account).isAppInstalled(address(appContract)));
    }

    function test_uninstallApp(address user) external givenSimpleAppIsRegistered {
        address account = _createAccountWithHubInstalled(user);

        ITownsApp appContract = ITownsApp(address(SIMPLE_APP));
        uint256 totalPrice = registry.getAppPrice(address(appContract));

        hoax(account, totalPrice);
        installer.installApp{value: totalPrice}(appContract, IAppAccount(account), "");

        vm.prank(account);
        installer.uninstallApp(appContract, IAppAccount(account), "");

        assertFalse(IAppAccount(account).isAppInstalled(address(appContract)));
    }
}
