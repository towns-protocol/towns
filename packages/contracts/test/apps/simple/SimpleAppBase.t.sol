// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IAppFactoryBase} from "../../../src/apps/facets/factory/IAppFactory.sol";
import {ISimpleAppBase} from "../../../src/apps/simple/app/ISimpleApp.sol";
import {ITownsApp} from "../../../src/apps/ITownsApp.sol";

// libraries

// contracts
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {AppFactoryFacet} from "../../../src/apps/facets/factory/AppFactoryFacet.sol";
import {AppInstallerFacet} from "../../../src/apps/facets/installer/AppInstallerFacet.sol";
import {AppRegistryFacet} from "../../../src/apps/facets/registry/AppRegistryFacet.sol";
import {AppAccount} from "../../../src/spaces/facets/account/AppAccount.sol";

abstract contract SimpleAppBaseTest is BaseSetup, IAppFactoryBase, ISimpleAppBase {
    AppFactoryFacet internal factory;
    AppInstallerFacet internal installer;
    AppRegistryFacet internal registry;
    AppAccount internal appAccount;

    address internal SIMPLE_APP;
    bytes32 internal SIMPLE_APP_ID;
    uint256 internal SIMPLE_APP_INSTALL_PRICE = 1 ether;

    function setUp() public override {
        super.setUp();
        factory = AppFactoryFacet(appRegistry);
        installer = AppInstallerFacet(appRegistry);
        registry = AppRegistryFacet(appRegistry);
        appAccount = AppAccount(everyoneSpace);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Utils                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier givenSimpleAppIsCreatedAndInstalled() {
        _createSimpleApp(appDeveloper, appClient);
        _installSimpleApp(SIMPLE_APP);
        _;
    }

    function _installSimpleApp(address app) internal {
        uint256 totalRequired = registry.getAppPrice(app);
        hoax(founder, totalRequired);
        installer.installApp{value: totalRequired}(ITownsApp(app), appAccount, "");
    }

    function _createSimpleApp(address _dev, address _client) internal {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: _client,
            installPrice: SIMPLE_APP_INSTALL_PRICE,
            accessDuration: 365 days
        });

        vm.prank(_dev);
        (SIMPLE_APP, SIMPLE_APP_ID) = factory.createApp(appData);
    }
}
