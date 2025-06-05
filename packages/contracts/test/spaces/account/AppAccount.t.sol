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

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

//contracts
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {AppRegistryFacet} from "src/apps/facets/registry/AppRegistryFacet.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// mocks
import {MockModule, MockModuleV2} from "test/mocks/MockModule.sol";
import {MockSavingsModule} from "test/mocks/MockSavingsModule.sol";
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
                    abi.encodeWithSelector(MockModule.initialize.selector, false, false)
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

        vm.prank(founder);
        emit IERC6900Account.ExecutionInstalled(address(mockModule), manifest);
        appAccount.installApp(address(mockModule), "", AppParams({delays: delays}));
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

        vm.prank(founder);
        vm.expectRevert(IAppAccountBase.UnauthorizedSelector.selector);
        appAccount.installApp(
            address(invalidModule),
            "",
            AppParams({delays: Delays({grantDelay: 0, executionDelay: 0})})
        );
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
}
