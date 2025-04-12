// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";
import {RevocationRequest} from "@ethereum-attestation-service/eas-contracts/IEAS.sol";

//libraries
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";
import {ModularAccountLib} from "src/spaces/facets/account/libraries/ModularAccountLib.sol";
import {ExecutorLib} from "src/spaces/facets/account/libraries/ExecutorLib.sol";

//contracts
import {ModularAccount} from "src/spaces/facets/account/ModularAccount.sol";
import {ModuleRegistry} from "src/attest/ModuleRegistry.sol";
import {SchemaRegistry} from "src/attest/SchemaRegistry.sol";
import {AttestationRegistry} from "src/attest/AttestationRegistry.sol";

// mocks
import {MockModule} from "test/mocks/MockModule.sol";
import {MockSavingsModule} from "test/mocks/MockSavingsModule.sol";
import {MockInvalidModule} from "test/mocks/MockInvalidModule.sol";

contract ModularAccountTest is BaseSetup, IOwnableBase {
    SchemaRegistry internal schemaRegistry;
    ModuleRegistry internal moduleRegistry;
    ModularAccount internal modularAccount;
    AttestationRegistry internal attestationRegistry;
    MockModule internal mockModule;

    bytes32 internal activeSchemaId;
    bytes32 internal moduleGroupId;

    address internal dev;
    address internal client;

    string internal MODULE_REGISTRY_SCHEMA =
        "address module, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest";

    function setUp() public override {
        super.setUp();
        modularAccount = ModularAccount(everyoneSpace);
        moduleRegistry = ModuleRegistry(appRegistry);
        schemaRegistry = SchemaRegistry(appRegistry);
        attestationRegistry = AttestationRegistry(appRegistry);
        mockModule = new MockModule(false);

        vm.startPrank(deployer);
        activeSchemaId = schemaRegistry.register(
            MODULE_REGISTRY_SCHEMA,
            ISchemaResolver(address(0)),
            true
        );
        moduleRegistry.adminRegisterModuleSchema(activeSchemaId);
        vm.stopPrank();

        dev = _randomAddress();
        client = _randomAddress();
    }

    modifier givenModuleIsRegistered() {
        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        moduleGroupId = moduleRegistry.registerModule(address(mockModule), dev, clients);
        _;
    }

    modifier givenModuleIsInstalled() {
        // setup clients
        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        moduleGroupId = moduleRegistry.registerModule(address(mockModule), dev, clients);

        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        emit IERC6900Account.ExecutionInstalled(address(mockModule), manifest);
        modularAccount.installExecution(address(mockModule), manifest, "");
        _;
    }

    // installExecution

    function test_installExecution() external givenModuleIsInstalled {
        vm.prank(client);
        vm.expectEmit(address(mockModule));
        emit MockModule.MockFunctionCalled(address(modularAccount), 0);
        modularAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });

        assertEq(
            modularAccount.isClientEntitled(address(mockModule), client, keccak256("Read")),
            true
        );
        assertEq(
            modularAccount.isClientEntitled(address(mockModule), client, keccak256("Create")),
            false
        );
    }

    function test_revertWhen_installExecution_notOwner() external givenModuleIsRegistered {
        address notOwner = _randomAddress();

        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        modularAccount.installExecution(address(mockModule), manifest, "");
    }

    function test_revertWhen_installExecution_emptyModuleAddress() external {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(ModularAccountLib.InvalidModuleAddress.selector));
        modularAccount.installExecution(address(0), manifest, "");
    }

    function test_revertWhen_installExecution_invalidManifest() external givenModuleIsRegistered {
        MockSavingsModule savingsModule = new MockSavingsModule();
        ExecutionManifest memory manifest = savingsModule.executionManifest();

        vm.prank(founder);
        vm.expectRevert(
            abi.encodeWithSelector(ModularAccountLib.InvalidManifest.selector, address(mockModule))
        );
        modularAccount.installExecution(address(mockModule), manifest, "");
    }

    function test_revertWhen_installExecution_moduleNotRegistered() external {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectRevert(
            abi.encodeWithSelector(
                ModularAccountLib.ModuleNotRegistered.selector,
                address(mockModule)
            )
        );
        modularAccount.installExecution(address(mockModule), manifest, "");
    }

    function test_revertWhen_installExecution_moduleRevoked() external givenModuleIsInstalled {
        vm.prank(dev);
        moduleRegistry.revokeModule(address(mockModule));

        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectRevert(
            abi.encodeWithSelector(ModularAccountLib.ModuleRevoked.selector, address(mockModule))
        );
        modularAccount.installExecution(address(mockModule), manifest, "");
    }

    function test_revertWhen_installExecution_invalidSelector() external {
        MockInvalidModule invalidModule = new MockInvalidModule();
        ExecutionManifest memory manifest = invalidModule.executionManifest();

        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        moduleGroupId = moduleRegistry.registerModule(address(invalidModule), dev, clients);

        vm.prank(founder);
        vm.expectRevert(ModularAccountLib.UnauthorizedSelector.selector);
        modularAccount.installExecution(address(invalidModule), manifest, "");
    }

    // uninstallExecution
    function test_uninstallExecution() external givenModuleIsInstalled {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        modularAccount.uninstallExecution(address(mockModule), manifest, "");

        bytes memory expectedRevert = abi.encodeWithSelector(
            ExecutorLib.UnauthorizedCall.selector,
            client,
            address(mockModule),
            mockModule.mockFunction.selector
        );

        vm.prank(client);
        vm.expectRevert(expectedRevert);
        modularAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });
    }

    function test_revertWhen_uninstallExecution_notOwner() external givenModuleIsInstalled {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, client));
        modularAccount.uninstallExecution(address(mockModule), manifest, "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Savings Module                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_savingsModule() external givenModuleIsInstalled {
        MockSavingsModule savingsModule = new MockSavingsModule();

        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        moduleGroupId = moduleRegistry.registerModule(address(savingsModule), dev, clients);

        ExecutionManifest memory manifest = savingsModule.executionManifest();

        uint256 maxEtherValue = 1 ether;
        address savingsModuleAddress = address(savingsModule);

        vm.startPrank(founder);
        modularAccount.installExecution(savingsModuleAddress, manifest, "");
        modularAccount.setModuleAllowance(savingsModuleAddress, maxEtherValue);
        vm.stopPrank();

        vm.deal(address(savingsModule), 5 ether);
        vm.deal(address(modularAccount), 1 ether);

        vm.prank(client);
        modularAccount.execute({
            target: savingsModuleAddress,
            value: maxEtherValue,
            data: abi.encodeWithSelector(savingsModule.deposit.selector, 1 ether)
        });

        assertEq(address(savingsModule).balance, 6 ether);
        assertEq(savingsModule.balances(address(modularAccount)), 1 ether);

        vm.warp(block.timestamp + 100 days);

        uint256 accruedInterest = savingsModule.getCurrentBalance(address(modularAccount));

        vm.prank(client);
        modularAccount.execute({
            target: savingsModuleAddress,
            value: 0,
            data: abi.encodeWithSelector(savingsModule.withdraw.selector, accruedInterest)
        });

        assertEq(address(modularAccount).balance, accruedInterest);
        assertEq(address(savingsModule).balance, 6 ether - accruedInterest);
    }
}
