// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ExecutorTypes} from "src/spaces/facets/account/libraries/ExecutorTypes.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//libraries
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

//contracts
import {ModularAccount} from "src/spaces/facets/account/ModularAccount.sol";
import {ModuleRegistry} from "src/attest/ModuleRegistry.sol";
import {SchemaRegistry} from "src/attest/SchemaRegistry.sol";
// mocks
import {MockERC721} from "test/mocks/MockERC721.sol";
import {MockModule} from "test/mocks/MockModule.sol";

contract ModularAccountTest is BaseSetup, IOwnableBase {
    bytes32 public constant MODULE_GROUP_ID = "MODULE_GROUP_ID";

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

    function test_installExecution() external {
        address module = address(new MockModule(false));

        ExecutionManifest memory manifest = mockModule.executionManifest();

        // setup clients
        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        moduleGroupId = moduleRegistry.registerModule(module, dev, clients);

        vm.prank(founder);
        modularAccount.installExecution(module, manifest, "");
    }

    // function test_installExecution() external {
    //     ExecutionManifest memory manifest = mockModule.executionManifest();

    //     bytes memory installData = abi.encode("test installation data");

    //     // Install the module
    //     vm.prank(founder);
    //     modularAccount.installExecution(address(mockModule), manifest, installData);

    //     bytes32 expectedGroupId = keccak256(abi.encode(MODULE_GROUP_ID, address(mockModule)));

    //     // Assert that the module was installed
    //     (bool hasAccess, uint32 executionDelay) = modularAccount.hasGroupAccess(
    //         expectedGroupId,
    //         address(mockModule)
    //     );
    //     assertEq(hasAccess, true);
    //     assertEq(executionDelay, 0);

    //     // Execute some code
    //     vm.prank(address(mockModule));
    //     vm.expectEmit(address(mockModule));
    //     emit MockModule.MockFunctionCalled(address(modularAccount), 0);
    //     modularAccount.execute(
    //         address(mockModule),
    //         0,
    //         abi.encodeWithSelector(mockModule.mockFunction.selector)
    //     );
    // }
}
