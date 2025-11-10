// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IAppAccountBase} from "src/spaces/facets/account/IAppAccount.sol";
import {IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";

//libraries
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

//contracts
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {AppTreasuryFacet} from "src/spaces/facets/account/treasury/AppTreasuryFacet.sol";
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {MockSimpleApp} from "test/mocks/MockSimpleApp.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AppInstallerFacet} from "src/apps/facets/installer/AppInstallerFacet.sol";
import {IAppFactory} from "src/apps/facets/factory/IAppFactory.sol";
import {IAppFactoryBase} from "src/apps/facets/factory/IAppFactory.sol";
import {AppFactoryFacet} from "src/apps/facets/factory/AppFactoryFacet.sol";

abstract contract AppAccountBaseTest is
    BaseSetup,
    IOwnableBase,
    IAppAccountBase,
    IAppRegistryBase,
    IAppFactoryBase
{
    AppAccount internal appAccount;
    AppTreasuryFacet internal appTreasury;
    AppRegistryFacet internal registry;
    AppFactoryFacet internal factory;

    uint256 internal DEFAULT_INSTALL_PRICE = 0.001 ether;
    uint48 internal DEFAULT_ACCESS_DURATION = 365 days;

    MockSimpleApp internal mockSimpleAppV1;

    function setUp() public override {
        super.setUp();
        appAccount = AppAccount(everyoneSpace);
        appTreasury = AppTreasuryFacet(everyoneSpace);
        registry = AppRegistryFacet(appRegistry);
        factory = AppFactoryFacet(appRegistry);
        mockSimpleAppV1 = new MockSimpleApp();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Internal                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _deployMockSimpleApp(address owner) internal returns (MockSimpleApp app) {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");

        vm.prank(owner);
        return
            MockSimpleApp(
                payable(
                    address(
                        new ERC1967Proxy(
                            address(mockSimpleAppV1),
                            abi.encodeCall(
                                ITownsApp.initialize,
                                abi.encode(
                                    msg.sender,
                                    "simple.app",
                                    permissions,
                                    DEFAULT_INSTALL_PRICE,
                                    DEFAULT_ACCESS_DURATION
                                )
                            )
                        )
                    )
                )
            );
    }

    function _registerAppAs(
        address _owner,
        ITownsApp _app,
        address _client
    ) internal returns (bytes32) {
        vm.prank(_owner);
        return registry.registerApp(_app, _client);
    }

    function _createAppAs(
        address _owner,
        AppParams memory _appParams
    ) internal returns (address app, bytes32 appId) {
        vm.prank(_owner);
        (app, appId) = factory.createApp(_appParams);
        return (app, appId);
    }

    function _installAppAs(address _owner, ITownsApp _app) internal {
        uint256 totalRequired = registry.getAppPrice(address(_app));
        hoax(_owner, totalRequired);
        AppInstallerFacet(appRegistry).installApp{value: totalRequired}(
            _app,
            appAccount,
            abi.encode(address(appAccount))
        );
    }

    function _getProtocolFee(uint256 installPrice) internal view returns (uint256) {
        IPlatformRequirements platform = IPlatformRequirements(spaceFactory);
        uint256 minPrice = platform.getMembershipFee();
        if (installPrice == 0) return minPrice;
        uint256 basisPointsFee = BasisPoints.calculate(installPrice, platform.getMembershipBps());
        return FixedPointMathLib.max(basisPointsFee, minPrice);
    }

    function _getTotalRequired(uint256 installPrice) internal view returns (uint256) {
        return installPrice == 0 ? _getProtocolFee(installPrice) : installPrice;
    }
}
