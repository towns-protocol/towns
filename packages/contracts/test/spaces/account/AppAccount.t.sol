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
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

//contracts
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// mocks
import {MockModule, MockModuleV2} from "test/mocks/MockModule.sol";
import {MockInvalidModule} from "test/mocks/MockInvalidModule.sol";

contract AppAccountTest is BaseSetup, IOwnableBase, IAppAccountBase {
    AppRegistryFacet internal registry;
    AppAccount internal appAccount;
    MockModule internal mockModule;

    bytes32 internal activeSchemaId;
    bytes32 internal appId;

    address internal dev;
    address internal client;

    string internal MODULE_REGISTRY_SCHEMA =
        "address module, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest";

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
        appId = registry.registerApp(address(mockModule), clients);
        _;
    }

    modifier givenAppIsInstalled() {
        // setup clients
        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        appId = registry.registerApp(address(mockModule), clients);

        ExecutionManifest memory manifest = mockModule.executionManifest();

        Delays memory delays = Delays({grantDelay: 0, executionDelay: 0});

        uint256 price = appAccount.getAppPrice(address(mockModule));
        uint256 protocolFee = _getProtocolFee(price);

        vm.deal(founder, price);

        vm.prank(founder);
        emit IERC6900Account.ExecutionInstalled(address(mockModule), manifest);
        appAccount.installApp{value: price}(address(mockModule), "", AppParams({delays: delays}));

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

        address[] memory clients = appAccount.getClients(address(mockModule));
        assertEq(clients.length, 1);
        assertEq(clients[0], client);
    }

    function test_revertWhen_installApp_notOwner() external givenAppIsRegistered {
        address notOwner = _randomAddress();

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        appAccount.installApp(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_revertWhen_installApp_emptyModuleId() external {
        vm.prank(founder);
        vm.expectRevert(IAppRegistryBase.AppNotRegistered.selector);
        appAccount.installApp(
            _randomAddress(),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_revertWhen_installApp_invalidManifest() external givenAppIsRegistered {
        MockModuleV2 mockModuleV2 = new MockModuleV2();
        mockModule.upgradeToAndCall(address(mockModuleV2), "");

        vm.prank(founder);
        vm.expectRevert(
            abi.encodeWithSelector(IAppAccountBase.InvalidManifest.selector, address(mockModule))
        );
        appAccount.installApp(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_revertWhen_installApp_moduleNotRegistered() external {
        vm.prank(founder);
        vm.expectRevert(IAppRegistryBase.AppNotRegistered.selector);
        appAccount.installApp(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_revertWhen_installApp_moduleRevoked() external givenAppIsRegistered {
        vm.prank(dev);
        registry.removeApp(appId);

        vm.prank(founder);
        vm.expectRevert(IAppRegistryBase.AppRevoked.selector);
        appAccount.installApp(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_revertWhen_installApp_invalidSelector() external {
        vm.prank(dev);
        MockInvalidModule invalidModule = new MockInvalidModule();

        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        appId = registry.registerApp(address(invalidModule), clients);

        uint256 price = appAccount.getAppPrice(address(invalidModule));
        vm.deal(founder, price);

        vm.prank(founder);
        vm.expectRevert(IAppAccountBase.UnauthorizedSelector.selector);
        appAccount.installApp{value: price}(
            address(invalidModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_revertWhen_installApp_insufficientPayment() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 requiredAmount = _getTotalRequired(price);
        uint256 insufficientAmount = requiredAmount - 1;

        _dealAndPay(founder, insufficientAmount);

        vm.expectRevert(IAppAccountBase.InsufficientPayment.selector);
        appAccount.installApp{value: insufficientAmount}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_installApp_withFreeApp() external givenAppIsRegistered {
        _setupAppWithPrice(0);

        uint256 protocolFee = _getProtocolFee(0);

        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionInstalled(
            address(mockModule),
            mockModule.executionManifest()
        );
        _dealAndPay(founder, protocolFee);
        appAccount.installApp{value: protocolFee}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );

        // Verify protocol fee was paid
        assertEq(address(deployer).balance, protocolFee);
    }

    function test_installApp_withPaidApp() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 protocolFee = _getProtocolFee(price);
        uint256 devInitialBalance = address(dev).balance;

        uint256 totalPrice = appAccount.getAppPrice(address(mockModule));

        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionInstalled(
            address(mockModule),
            mockModule.executionManifest()
        );
        _dealAndPay(founder, totalPrice);
        appAccount.installApp{value: totalPrice}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );

        // Verify fee distribution
        assertEq(address(deployer).balance, protocolFee);
        assertEq(address(dev).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenProtocolFeeEqualsPrice() external givenAppIsRegistered {
        // Get minimum protocol fee
        uint256 minFee = IPlatformRequirements(spaceFactory).getMembershipFee();
        _setupAppWithPrice(minFee);

        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionInstalled(
            address(mockModule),
            mockModule.executionManifest()
        );

        uint256 totalPrice = appAccount.getAppPrice(address(mockModule));

        _dealAndPay(founder, totalPrice);
        appAccount.installApp{value: totalPrice}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );

        // Verify all payment went to protocol fee recipient
        assertEq(address(deployer).balance, minFee);
        assertEq(address(dev).balance, totalPrice - minFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenBpsHigherThanMinFee() external givenAppIsRegistered {
        // Set price high enough that BPS fee > min fee
        uint256 price = 100 ether;
        _setupAppWithPrice(price);

        uint256 protocolFee = _getProtocolFee(price);
        uint256 minFee = IPlatformRequirements(spaceFactory).getMembershipFee();
        uint256 devInitialBalance = address(dev).balance;

        uint256 totalPrice = appAccount.getAppPrice(address(mockModule));

        _dealAndPay(founder, totalPrice);
        appAccount.installApp{value: totalPrice}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );

        // Verify BPS fee was used instead of min fee
        assertEq(address(deployer).balance, protocolFee);
        assertTrue(protocolFee > minFee);
        assertEq(address(dev).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_whenBpsLowerThanMinFee() external givenAppIsRegistered {
        // Set price low enough that BPS fee < min fee
        uint256 price = 0.01 ether;
        _setupAppWithPrice(price);

        uint256 protocolFee = _getProtocolFee(price);
        uint256 minFee = IPlatformRequirements(spaceFactory).getMembershipFee();
        uint256 bpsFee = BasisPoints.calculate(
            price,
            IPlatformRequirements(spaceFactory).getMembershipBps()
        );
        uint256 devInitialBalance = address(dev).balance;

        uint256 totalPrice = appAccount.getAppPrice(address(mockModule));

        _dealAndPay(founder, totalPrice);
        appAccount.installApp{value: totalPrice}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );

        // Verify min fee was used instead of BPS fee
        assertEq(address(deployer).balance, protocolFee);
        assertTrue(bpsFee < minFee);
        assertEq(protocolFee, minFee);
        assertEq(address(dev).balance - devInitialBalance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    function test_installApp_withExcessPayment() external givenAppIsRegistered {
        uint256 price = 1 ether;
        _setupAppWithPrice(price);

        uint256 totalPrice = appAccount.getAppPrice(address(mockModule));
        uint256 protocolFee = _getProtocolFee(price);

        uint256 excess = 0.5 ether;
        uint256 payment = totalPrice + excess;
        uint256 founderInitialBalance = address(founder).balance;

        _dealAndPay(founder, payment);
        appAccount.installApp{value: payment}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );

        // Verify excess was refunded
        assertEq(address(founder).balance - founderInitialBalance, excess);
        assertEq(address(dev).balance, totalPrice - protocolFee);
        assertEq(address(appAccount).balance, 0);
    }

    // uninstallApp
    function test_uninstallApp() external givenAppIsInstalled {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionUninstalled(address(mockModule), true, manifest);
        appAccount.uninstallApp(address(mockModule), "");

        vm.prank(client);
        vm.expectRevert(IExecutorBase.UnauthorizedCall.selector);
        appAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });
    }

    function test_revertWhen_uninstallApp_notOwner() external givenAppIsInstalled {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, client));
        appAccount.uninstallApp(address(mockModule), "");
    }

    // execute
    function test_revertWhen_execute_bannedApp() external givenAppIsInstalled {
        vm.prank(deployer);
        registry.adminBanApp(address(mockModule));

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
        uint256 price = appAccount.getAppPrice(address(mockModule));
        _dealAndPay(founder, price);
        appAccount.installApp{value: price}(
            address(mockModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );

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
        uint256 price = appAccount.getAppPrice(address(mockModule));

        bytes memory installData = abi.encode("test data");
        vm.expectEmit(address(mockModule));
        emit MockModule.OnInstallCalled(address(appAccount), installData);

        _dealAndPay(founder, price);
        appAccount.installApp{value: price}(
            address(mockModule),
            installData,
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_revertWhen_installApp_hookFails() external givenAppIsRegistered {
        uint256 price = appAccount.getAppPrice(address(mockModule));

        vm.prank(dev);
        mockModule.setShouldFailInstall(true);

        bytes memory installData = abi.encode("test data");
        _dealAndPay(founder, price);
        vm.expectRevert("Installation failed");
        appAccount.installApp{value: price}(
            address(mockModule),
            installData,
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
    }

    function test_uninstallApp_withUninstallData() external givenAppIsInstalled {
        bytes memory uninstallData = abi.encode("test data");

        vm.expectEmit(address(mockModule));
        emit MockModule.OnUninstallCalled(address(appAccount), uninstallData);

        vm.prank(founder);
        appAccount.uninstallApp(address(mockModule), uninstallData);
    }

    function test_uninstallApp_whenHookFails() external givenAppIsInstalled {
        vm.prank(dev);
        mockModule.setShouldFailUninstall(true);

        bytes memory uninstallData = abi.encode("test data");
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionUninstalled(address(mockModule), false, manifest);
        appAccount.uninstallApp(address(mockModule), uninstallData);

        assertEq(appAccount.isAppEntitled(address(mockModule), client, keccak256("Read")), false);
    }

    function test_revertWhen_getApp_revokedAttestation() external givenAppIsRegistered {
        vm.prank(dev);
        registry.removeApp(appId);

        bytes32 _appId = appAccount.getAppId(address(mockModule));
        assertEq(_appId, bytes32(0));
    }

    function test_revertWhen_getApp_emptyAttestation() external {
        vm.prank(founder);
        bytes32 _appId = appAccount.getAppId(address(mockModule));
        assertEq(_appId, bytes32(0));
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

    function _setupAppWithPrice(uint256 price) internal {
        vm.prank(dev);
        mockModule.setPrice(price);
    }

    function _dealAndPay(address payer, uint256 amount) internal {
        vm.deal(payer, amount);
        vm.prank(payer);
    }
}
