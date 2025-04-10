// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ExecutorTypes} from "src/spaces/facets/account/libraries/ExecutorTypes.sol";

// types
import {ExecutionManifest} from "@erc6900/reference-implementation/interfaces/IERC6900ExecutionModule.sol";

//libraries
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";

//contracts
import {ModularAccount} from "src/spaces/facets/account/ModularAccount.sol";

// mocks
import {MockERC721} from "test/mocks/MockERC721.sol";
import {MockModule} from "test/mocks/MockModule.sol";

contract ModularAccountTest is BaseSetup, IOwnableBase {
    bytes32 public constant MODULE_GROUP_ID = "MODULE_GROUP_ID";

    ModularAccount internal modularAccount;
    MockERC721 internal mockERC721;
    MockModule internal mockModule;

    function setUp() public override {
        super.setUp();
        modularAccount = ModularAccount(everyoneSpace);
        mockERC721 = new MockERC721();
        mockModule = new MockModule(false);
    }

    function test_installExecution() external {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        bytes memory installData = abi.encode("test installation data");

        // Install the module
        vm.prank(founder);
        modularAccount.installExecution(address(mockModule), manifest, installData);

        bytes32 expectedGroupId = keccak256(abi.encode(MODULE_GROUP_ID, address(mockModule)));

        // Assert that the module was installed
        (bool hasAccess, uint32 executionDelay) = modularAccount.hasGroupAccess(
            expectedGroupId,
            address(mockModule)
        );
        assertEq(hasAccess, true);
        assertEq(executionDelay, 0);

        // Execute some code
        vm.prank(address(mockModule));
        vm.expectEmit(address(mockModule));
        emit MockModule.MockFunctionCalled(address(modularAccount), 0);
        modularAccount.execute(
            address(mockModule),
            0,
            abi.encodeWithSelector(mockModule.mockFunction.selector)
        );
    }
}
