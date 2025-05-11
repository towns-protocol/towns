// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IExecutorBase} from "src/spaces/facets/account/interfaces/IExecutor.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IAppAccountBase} from "src/spaces/facets/account/interfaces/IAppAccount.sol";
import {IModuleRegistryBase} from "src/modules/interfaces/IModuleRegistry.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

//contracts
import {AppAccount} from "src/spaces/facets/account/AppAccount.sol";
import {ModuleRegistry} from "src/modules/ModuleRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// mocks
import {MockModule, MockModuleV2} from "test/mocks/MockModule.sol";
import {MockSavingsModule} from "test/mocks/MockSavingsModule.sol";
import {MockInvalidModule} from "test/mocks/MockInvalidModule.sol";

contract AppAccountTest is BaseSetup, IOwnableBase, IAppAccountBase {
    ModuleRegistry internal moduleRegistry;
    AppAccount internal appAccount;
    MockModule internal mockModule;

    bytes32 internal activeSchemaId;
    bytes32 internal versionId;

    address internal dev;
    address internal client;

    string internal MODULE_REGISTRY_SCHEMA =
        "address module, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest";

    function setUp() public override {
        super.setUp();
        appAccount = AppAccount(everyoneSpace);
        moduleRegistry = ModuleRegistry(appRegistry);

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
        versionId = moduleRegistry.registerModule(address(mockModule), clients);
        _;
    }

    modifier givenAppIsInstalled() {
        // setup clients
        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        versionId = moduleRegistry.registerModule(address(mockModule), clients);

        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        emit IERC6900Account.ExecutionInstalled(address(mockModule), manifest);
        appAccount.installApp(
            versionId,
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
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

        assertEq(appAccount.isAppEntitled(versionId, client, keccak256("Read")), true);
        assertEq(appAccount.isAppEntitled(versionId, client, keccak256("Create")), false);
    }

    function test_revertWhen_execute_bannedApp() external givenAppIsInstalled {
        vm.prank(deployer);
        moduleRegistry.adminBanModule(address(mockModule));

        vm.prank(client);
        vm.expectRevert(IAppAccountBase.InvalidAppId.selector);
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
            versionId,
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installApp_emptyModuleId() external {
        vm.prank(founder);
        vm.expectRevert(IAppAccountBase.InvalidAppId.selector);
        appAccount.installApp(
            versionId,
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: 0})
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
            versionId,
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installApp_moduleNotRegistered() external {
        vm.prank(founder);
        vm.expectRevert(IModuleRegistryBase.ModuleNotRegistered.selector);
        appAccount.installApp(
            _randomBytes32(),
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installApp_moduleRevoked() external givenAppIsInstalled {
        vm.prank(dev);
        moduleRegistry.removeModule(versionId);

        vm.prank(founder);
        vm.expectRevert(IModuleRegistryBase.ModuleRevoked.selector);
        appAccount.installApp(
            versionId,
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installApp_invalidSelector() external {
        vm.prank(dev);
        MockInvalidModule invalidModule = new MockInvalidModule();

        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        versionId = moduleRegistry.registerModule(address(invalidModule), clients);

        vm.prank(founder);
        vm.expectRevert(IAppAccountBase.UnauthorizedSelector.selector);
        appAccount.installApp(
            versionId,
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    // uninstallApp
    function test_uninstallApp() external givenAppIsInstalled {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectEmit(address(appAccount));
        emit IERC6900Account.ExecutionUninstalled(address(mockModule), true, manifest);
        appAccount.uninstallApp(versionId, "");

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
        appAccount.uninstallApp(versionId, "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Allowance                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_allowance() external givenAppIsInstalled {
        uint256 allowance = 1 ether;
        vm.prank(founder);
        appAccount.setAppAllowance(versionId, allowance);

        assertEq(appAccount.getAppAllowance(versionId), allowance);
    }

    function test_revertWhen_setAllowance_notOwner() external givenAppIsInstalled {
        uint256 allowance = 1 ether;
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, client));
        appAccount.setAppAllowance(versionId, allowance);
    }

    function test_revertWhen_setAllowance_invalidModule() external givenAppIsInstalled {
        bytes32 invalidModule = _randomBytes32();
        uint256 allowance = 1 ether;
        vm.prank(founder);
        vm.expectRevert(IAppAccountBase.AppNotInstalled.selector);
        appAccount.setAppAllowance(invalidModule, allowance);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Savings Module                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_savingsModule() external givenAppIsInstalled {
        vm.prank(dev);
        MockSavingsModule savingsModule = new MockSavingsModule();

        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        versionId = moduleRegistry.registerModule(address(savingsModule), clients);

        uint256 maxEtherValue = 1 ether;
        address savingsModuleAddress = address(savingsModule);

        vm.deal(address(savingsModule), 5 ether);
        vm.deal(address(appAccount), 1 ether);

        vm.startPrank(founder);
        appAccount.installApp(
            versionId,
            "",
            AppParams({grantDelay: 0, executionDelay: 0, allowance: maxEtherValue})
        );
        vm.stopPrank();

        vm.prank(client);
        appAccount.execute({
            target: savingsModuleAddress,
            value: maxEtherValue,
            data: abi.encodeWithSelector(savingsModule.deposit.selector, 1 ether)
        });

        assertEq(address(savingsModule).balance, 6 ether);
        assertEq(savingsModule.balances(address(appAccount)), 1 ether);

        vm.warp(block.timestamp + 100 days);

        uint256 accruedInterest = savingsModule.getCurrentBalance(address(appAccount));

        vm.prank(client);
        appAccount.execute({
            target: savingsModuleAddress,
            value: 0,
            data: abi.encodeWithSelector(savingsModule.withdraw.selector, accruedInterest)
        });

        assertEq(address(appAccount).balance, accruedInterest);
        assertEq(address(savingsModule).balance, 6 ether - accruedInterest);
    }
}
