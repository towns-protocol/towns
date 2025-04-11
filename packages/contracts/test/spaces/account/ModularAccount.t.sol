// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ExecutorTypes} from "src/spaces/facets/account/libraries/ExecutorTypes.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

//libraries
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

//contracts
import {ModularAccount} from "src/spaces/facets/account/ModularAccount.sol";
import {ModuleRegistry} from "src/attest/ModuleRegistry.sol";
import {SchemaRegistry} from "src/attest/SchemaRegistry.sol";

// mocks
import {MockERC721} from "test/mocks/MockERC721.sol";
import {MockModule} from "test/mocks/MockModule.sol";
import {MockSavingsModule} from "test/mocks/MockSavingsModule.sol";

contract ModularAccountTest is BaseSetup, IOwnableBase {
    SchemaRegistry internal schemaRegistry;
    ModuleRegistry internal moduleRegistry;
    ModularAccount internal modularAccount;

    MockERC721 internal mockERC721;
    MockModule internal mockModule;

    bytes32 internal activeSchemaId;
    bytes32 internal moduleGroupId;

    address internal dev;
    address internal client;

    string internal MODULE_REGISTRY_SCHEMA =
        "address module, address owner, address[] clients, bytes32[] permissions, ExecutionManifest manifest";

    function setUp() public override {
        super.setUp();
        moduleRegistry = ModuleRegistry(appRegistry);
        modularAccount = ModularAccount(everyoneSpace);
        schemaRegistry = SchemaRegistry(appRegistry);
        mockERC721 = new MockERC721();
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

    function test_installExecution() external givenModuleIsInstalled {
        vm.prank(client);
        vm.expectEmit(address(mockModule));
        emit MockModule.MockFunctionCalled(address(modularAccount), 0);
        modularAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });
    }

    function test_uninstallExecution() external givenModuleIsInstalled {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        modularAccount.uninstallExecution(address(mockModule), manifest, "");

        bytes memory expectedRevert = abi.encodeWithSelector(
            ExecutorTypes.UnauthorizedCall.selector,
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

        vm.prank(founder);
        modularAccount.installExecution(address(savingsModule), manifest, "");

        vm.deal(address(savingsModule), 5 ether);
        vm.deal(address(modularAccount), 1 ether);

        vm.prank(client);
        modularAccount.execute({
            target: address(savingsModule),
            value: 1 ether,
            data: abi.encodeWithSelector(savingsModule.deposit.selector, 1 ether)
        });

        assertEq(address(savingsModule).balance, 6 ether);
        assertEq(savingsModule.balances(address(modularAccount)), 1 ether);

        vm.warp(block.timestamp + 100 days);

        uint256 accruedInterest = savingsModule.getCurrentBalance(address(modularAccount));

        vm.prank(client);
        modularAccount.execute({
            target: address(savingsModule),
            value: 0,
            data: abi.encodeWithSelector(savingsModule.withdraw.selector, accruedInterest)
        });

        assertEq(address(modularAccount).balance, accruedInterest);
        assertEq(address(savingsModule).balance, 6 ether - accruedInterest);
    }
}
