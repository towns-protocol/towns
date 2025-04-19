// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {BaseSetup} from "test/spaces/BaseSetup.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ISchemaResolver} from "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";
import {IERC6900Account} from "@erc6900/reference-implementation/interfaces/IERC6900Account.sol";
import {IAccountBase} from "src/spaces/facets/account/interfaces/IAccount.sol";
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
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// mocks
import {MockModule, MockModuleV2} from "test/mocks/MockModule.sol";
import {MockSavingsModule} from "test/mocks/MockSavingsModule.sol";
import {MockInvalidModule} from "test/mocks/MockInvalidModule.sol";

contract ModularAccountTest is BaseSetup, IOwnableBase, IAccountBase {
    ModuleRegistry internal moduleRegistry;
    ModularAccount internal modularAccount;
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

        MockModule mockModuleV1 = new MockModule();
        mockModule = MockModule(address(new ERC1967Proxy(address(mockModuleV1), "")));

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
        modularAccount.installModule(
            moduleGroupId,
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
        _;
    }

    // installModule

    function test_installModule() external givenModuleIsInstalled {
        vm.prank(client);
        vm.expectEmit(address(mockModule));
        emit MockModule.MockFunctionCalled(address(modularAccount), 0);
        modularAccount.execute({
            target: address(mockModule),
            value: 0,
            data: abi.encodeWithSelector(mockModule.mockFunction.selector)
        });

        assertEq(modularAccount.isModuleEntitled(moduleGroupId, client, keccak256("Read")), true);
        assertEq(
            modularAccount.isModuleEntitled(moduleGroupId, client, keccak256("Create")),
            false
        );
    }

    function test_revertWhen_installModule_notOwner() external givenModuleIsRegistered {
        address notOwner = _randomAddress();

        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, notOwner));
        modularAccount.installModule(
            moduleGroupId,
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installModule_emptyModuleId() external {
        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(ModularAccountLib.InvalidModuleId.selector));
        modularAccount.installModule(
            moduleGroupId,
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installModule_invalidManifest() external givenModuleIsRegistered {
        MockModuleV2 mockModuleV2 = new MockModuleV2();
        mockModule.upgradeToAndCall(address(mockModuleV2), "");

        vm.prank(founder);
        vm.expectRevert(
            abi.encodeWithSelector(ModularAccountLib.InvalidManifest.selector, address(mockModule))
        );
        modularAccount.installModule(
            moduleGroupId,
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installModule_moduleNotRegistered() external {
        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(ModularAccountLib.ModuleNotRegistered.selector));
        modularAccount.installModule(
            _randomBytes32(),
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installModule_moduleRevoked() external givenModuleIsInstalled {
        vm.prank(dev);
        moduleRegistry.removeModule(moduleGroupId);

        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(ModularAccountLib.ModuleRevoked.selector));
        modularAccount.installModule(
            moduleGroupId,
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    function test_revertWhen_installModule_invalidSelector() external {
        MockInvalidModule invalidModule = new MockInvalidModule();

        address[] memory clients = new address[](1);
        clients[0] = client;

        vm.prank(dev);
        moduleGroupId = moduleRegistry.registerModule(address(invalidModule), dev, clients);

        vm.prank(founder);
        vm.expectRevert(ModularAccountLib.UnauthorizedSelector.selector);
        modularAccount.installModule(
            moduleGroupId,
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: 0})
        );
    }

    // uninstallModule
    function test_uninstallModule() external givenModuleIsInstalled {
        ExecutionManifest memory manifest = mockModule.executionManifest();

        vm.prank(founder);
        vm.expectEmit(address(modularAccount));
        emit IERC6900Account.ExecutionUninstalled(address(mockModule), true, manifest);
        modularAccount.uninstallModule(moduleGroupId, "");

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

    function test_revertWhen_uninstallModule_notOwner() external givenModuleIsInstalled {
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, client));
        modularAccount.uninstallModule(moduleGroupId, "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Allowance                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_allowance() external givenModuleIsInstalled {
        uint256 allowance = 1 ether;
        vm.prank(founder);
        modularAccount.setModuleAllowance(moduleGroupId, allowance);

        assertEq(modularAccount.getModuleAllowance(moduleGroupId), allowance);
    }

    function test_revertWhen_setAllowance_notOwner() external givenModuleIsInstalled {
        uint256 allowance = 1 ether;
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, client));
        modularAccount.setModuleAllowance(moduleGroupId, allowance);
    }

    function test_revertWhen_setAllowance_invalidModule() external givenModuleIsInstalled {
        bytes32 invalidModule = _randomBytes32();
        uint256 allowance = 1 ether;
        vm.prank(founder);
        vm.expectRevert(abi.encodeWithSelector(ModularAccountLib.ModuleNotInstalled.selector));
        modularAccount.setModuleAllowance(invalidModule, allowance);
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

        uint256 maxEtherValue = 1 ether;
        address savingsModuleAddress = address(savingsModule);

        vm.deal(address(savingsModule), 5 ether);
        vm.deal(address(modularAccount), 1 ether);

        vm.startPrank(founder);
        modularAccount.installModule(
            moduleGroupId,
            "",
            ModuleParams({grantDelay: 0, executionDelay: 0, allowance: maxEtherValue})
        );
        vm.stopPrank();

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
