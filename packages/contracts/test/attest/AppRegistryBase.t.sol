// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces

import {IAppRegistryBase} from "../../src/apps/facets/registry/IAppRegistry.sol";
import {IAppAccountBase} from "../../src/spaces/facets/account/IAppAccount.sol";
import {IAttestationRegistryBase} from "src/apps/facets/attest/IAttestationRegistry.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {SimpleApp} from "../../src/apps/helpers/SimpleApp.sol";

//libraries
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SIMPLE_APP_TYPE} from "scripts/deployments/diamonds/DeploySimpleAppBeacon.s.sol";
// types

//contracts
import {AppRegistryFacet} from "../../src/apps/facets/registry/AppRegistryFacet.sol";
import {AppAccount} from "../../src/spaces/facets/account/AppAccount.sol";
import {MockModule} from "../../test/mocks/MockModule.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract AppRegistryBaseTest is
    BaseSetup,
    IAppRegistryBase,
    IAttestationRegistryBase,
    IAppAccountBase
{
    AppRegistryFacet internal registry;
    AppAccount internal appAccount;
    MockModule internal mockModule;

    uint256 internal DEFAULT_INSTALL_PRICE = 0.001 ether;
    uint48 internal DEFAULT_ACCESS_DURATION = 365 days;
    address internal DEFAULT_CLIENT;
    address internal DEFAULT_DEV;
    bytes32 internal DEFAULT_APP_ID;

    address payable internal SIMPLE_APP;
    bytes32 internal SIMPLE_APP_ID;

    function setUp() public override {
        super.setUp();
        registry = AppRegistryFacet(appRegistry);
        appAccount = AppAccount(everyoneSpace);

        DEFAULT_CLIENT = _randomAddress();
        DEFAULT_DEV = _randomAddress();

        MockModule mockModuleV1 = new MockModule();
        vm.prank(DEFAULT_DEV);
        mockModule = MockModule(
            payable(
                address(
                    new ERC1967Proxy(
                        address(mockModuleV1),
                        abi.encodeWithSelector(
                            MockModule.initialize.selector,
                            false,
                            false,
                            false,
                            0
                        )
                    )
                )
            )
        );
    }

    modifier givenAppIsRegistered() {
        vm.prank(DEFAULT_DEV);
        DEFAULT_APP_ID = registry.registerApp(mockModule, DEFAULT_CLIENT);
        _;
    }

    modifier givenSimpleAppIsCreated() {
        // create app
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: DEFAULT_CLIENT,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION,
            extraData: ""
        });

        vm.prank(DEFAULT_DEV);
        (address app, bytes32 appId) = registry.createAppByType(SIMPLE_APP_TYPE, appData);
        SIMPLE_APP_ID = appId;
        SIMPLE_APP = payable(app);
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Utils                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function _createSimpleApp(address client) internal returns (address simpleApp) {
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");
        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: client,
            installPrice: DEFAULT_INSTALL_PRICE,
            accessDuration: DEFAULT_ACCESS_DURATION,
            extraData: ""
        });

        vm.prank(DEFAULT_DEV);
        (simpleApp, ) = registry.createApp(appData);
    }

    function _setupAppWithPrice(uint256 price) internal {
        vm.prank(DEFAULT_DEV);
        mockModule.setPrice(price);
    }

    function _getProtocolFee(uint256 installPrice) internal view returns (uint256) {
        IPlatformRequirements platform = IPlatformRequirements(spaceFactory);
        uint256 minPrice = platform.getMembershipFee();
        if (installPrice == 0) return minPrice;
        uint256 basisPointsFee = BasisPoints.calculate(installPrice, platform.getMembershipBps());
        return FixedPointMathLib.max(basisPointsFee, minPrice);
    }
}
