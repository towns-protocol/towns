// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IExecutorBase} from "src/spaces/facets/executor/IExecutor.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IAppAccountBase} from "src/spaces/facets/account/IAppAccount.sol";
import {IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";
import {IPlatformRequirements} from "src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation, EMPTY_UID} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

//contracts
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// mocks
import {MockModule, MockModuleV2} from "test/mocks/MockModule.sol";
import {MockInvalidModule} from "test/mocks/MockInvalidModule.sol";

contract AppAccountTest is BaseSetup, IOwnableBase, IAppAccountBase, IAppRegistryBase {
    AppRegistryFacet internal registry;
    AppAccount internal appAccount;
    MockModule internal mockModule;

    bytes32 internal appId;

    address internal dev;
    address internal client;

    function setUp() public override {
        super.setUp();
        appAccount = AppAccount(everyoneSpace);
        registry = AppRegistryFacet(appRegistry);

        dev = _randomAddress();
        client = _randomAddress();

        MockModule mockModuleV1 = new MockModule();

        vm.prank(dev);
        mockModule = MockModule(
            address(
                new ERC1967Proxy(
                    address(mockModuleV1),
                    abi.encodeWithSelector(MockModule.initialize.selector, false, false, false, 0)
                )
            )
        );
    }

    modifier givenAppIsRegistered() {
        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        appId = registry.registerApp(mockModule, clients);
        _;
    }

    modifier givenAppIsInstalled() {
        // setup clients
        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        appId = registry.registerApp(mockModule, clients);

        ExecutionManifest memory manifest = mockModule.executionManifest();
        uint256 totalRequired = registry.getAppPrice(address(mockModule));

        uint256 protocolFee = _getProtocolFee(totalRequired);

        hoax(founder, totalRequired);
        emit IERC6900Account.ExecutionInstalled(address(mockModule), manifest);
        registry.installApp{value: totalRequired}(mockModule, appAccount, "");

        // assert that the founder has paid the price
        assertEq(address(deployer).balance, protocolFee);

        _;
    }

    // installApp
    function test_installApp() external givenAppIsInstalled {
        vm.prank(client);
        vm.expectEmit(address(mockModule));
        emit MockModule.MockFunctionCalled(address(appAccount), 0);
        appAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });

        assertEq(appAccount.isAppEntitled(address(mockModule), client, keccak256("Read")), true);
        assertEq(appAccount.isAppEntitled(address(mockModule), client, keccak256("Create")), false);

        address[] memory clients = appAccount.getAppClients(address(mockModule));
        assertEq(clients.length, 1);
        assertEq(clients[0], client);
    }

    function test_revertWhen_installApp_notRegistry() external {
        vm.prank(client);
        vm.expectRevert(InvalidCaller.selector);
        appAccount.onInstallApp(appId, "");
    }

    function test_revertWhen_installApp_appNotRegistered() external {
        vm.prank(appRegistry);
        vm.expectRevert(AppNotRegistered.selector);
        appAccount.onInstallApp(_randomBytes32(), "");
    }

    function test_revertWhen_installApp_emptyAppId() external {
        vm.prank(appRegistry);
        vm.expectRevert(InvalidAppId.selector);
        appAccount.onInstallApp(EMPTY_UID, "");
    }

    function test_revertWhen_installApp_invalidManifest() external givenAppIsRegistered {
        MockModuleV2 mockModuleV2 = new MockModuleV2();
        mockModule.upgradeToAndCall(address(mockModuleV2), "");

        vm.prank(appRegistry);
        vm.expectRevert(
            abi.encodeWithSelector(IAppAccountBase.InvalidManifest.selector, address(mockModule))
        );
        appAccount.onInstallApp(appId, "");
    }

    function test_revertWhen_installApp_invalidSelector() external {
        vm.prank(dev);
        MockInvalidModule invalidModule = new MockInvalidModule();

        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        appId = registry.registerApp(invalidModule, clients);

        uint256 price = registry.getAppPrice(address(invalidModule));

        hoax(founder, price);
        vm.expectRevert(IAppAccountBase.UnauthorizedSelector.selector);
        registry.installApp{value: price}(invalidModule, appAccount, "");
    }

    // onUninstallApp
    function test_uninstallApp() external givenAppIsInstalled {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(appRegistry);
        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionUninstalled(address(mockModule), true, manifest);
        appAccount.onUninstallApp(appId, "");

        vm.prank(client);
        vm.expectRevert(IExecutorBase.UnauthorizedCall.selector);
        appAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });
    }

    function test_revertWhen_uninstallApp_invalidAppId() external {
        vm.prank(appRegistry);
        vm.expectRevert(InvalidAppId.selector);
        appAccount.onUninstallApp(EMPTY_UID, "");
    }

    function test_revertWhen_uninstallApp_notRegistry() external givenAppIsInstalled {
        vm.prank(client);
        vm.expectRevert(InvalidCaller.selector);
        appAccount.onUninstallApp(appId, "");
    }

    function test_revertWhen_uninstallApp_notInstalled() external givenAppIsRegistered {
        vm.prank(appRegistry);
        vm.expectRevert(AppNotInstalled.selector);
        appAccount.onUninstallApp(appId, "");
    }

    function test_revertWhen_uninstallApp_appNotRegistered() external givenAppIsInstalled {
        vm.prank(appRegistry);
        vm.expectRevert(AppNotRegistered.selector);
        appAccount.onUninstallApp(_randomBytes32(), "");
    }

    function test_uninstallApp_withUninstallData() external givenAppIsInstalled {
        bytes memory uninstallData = abi.encode("test data");

        vm.expectEmit(address(mockModule));
        emit MockModule.OnUninstallCalled(address(appAccount), uninstallData);

        vm.prank(founder);
        registry.uninstallApp(mockModule, appAccount, uninstallData);
    }

    function test_revertWhen_uninstallApp_whenHookFails() external givenAppIsInstalled {
        vm.prank(dev);
        mockModule.setShouldFailUninstall(true);

        bytes memory uninstallData = abi.encode("test data");
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionUninstalled(address(mockModule), false, manifest);
        registry.uninstallApp(mockModule, appAccount, uninstallData);

        assertEq(appAccount.isAppEntitled(address(mockModule), client, keccak256("Read")), false);
    }

    // execute
    function test_revertWhen_execute_bannedApp() external givenAppIsInstalled {
        vm.prank(deployer);
        registry.adminBanApp(mockModule);

        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(IAppAccountBase.UnauthorizedApp.selector, address(mockModule))
        );
        appAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });
    }

    function test_disableAndReEnableApp() external givenAppIsInstalled {
        // Disable app
        vm.prank(founder);
        appAccount.disableApp(address(mockModule));

        // Try to execute - should fail
        vm.prank(client);
        vm.expectRevert(IExecutorBase.UnauthorizedCall.selector);
        appAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });

        // Re-enable by installing again
        vm.prank(founder);
        appAccount.enableApp(address(mockModule));

        // Should be able to execute now
        vm.prank(client);
        appAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });
    }

    function test_isEntitled_clientWithoutPermission() external givenAppIsInstalled {
        assertEq(
            appAccount.isAppEntitled(
                address(mockModule),
                client,
                keccak256("NonExistentPermission")
            ),
            false
        );
    }

    function test_isEntitled_nonExistentApp() external view {
        assertEq(appAccount.isAppEntitled(address(0xdead), client, keccak256("Read")), false);
    }

    function test_installApp_withInstallData() external givenAppIsRegistered {
        uint256 price = registry.getAppPrice(address(mockModule));

        bytes memory installData = abi.encode("test data");
        vm.expectEmit(address(mockModule));
        emit MockModule.OnInstallCalled(address(appAccount), installData);

        hoax(founder, price);
        registry.installApp{value: price}(mockModule, appAccount, installData);
    }

    function test_revertWhen_installApp_hookFails() external givenAppIsRegistered {
        uint256 price = registry.getAppPrice(address(mockModule));

        vm.prank(dev);
        mockModule.setShouldFailInstall(true);

        bytes memory installData = abi.encode("test data");
        hoax(founder, price);
        vm.expectRevert("Installation failed");
        registry.installApp{value: price}(mockModule, appAccount, installData);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Utils                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
