// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {INodeRegistry} from "contracts/src/river/registry/facets/node/INodeRegistry.sol";
import {IOperatorRegistry} from "contracts/src/river/registry/facets/operator/IOperatorRegistry.sol";
import {IStreamRegistry} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";
import {IRiverConfig} from "contracts/src/river/registry/facets/config/IRiverConfig.sol";

// structs
import {NodeStatus, Node, Setting} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

// deployments
import {DeployRiverRegistry} from "contracts/scripts/deployments/DeployRiverRegistry.s.sol";

contract RiverRegistryTest is TestUtils, IOwnableBase {
  DeployRiverRegistry internal deployRiverRegistry = new DeployRiverRegistry();

  address deployer;
  address diamond;

  INodeRegistry internal nodeRegistry;
  IStreamRegistry internal streamRegistry;
  IOperatorRegistry internal operatorRegistry;
  IRiverConfig internal riverConfig;

  function setUp() public virtual {
    deployer = getDeployer();
    diamond = deployRiverRegistry.deploy();

    nodeRegistry = INodeRegistry(diamond);
    streamRegistry = IStreamRegistry(diamond);
    operatorRegistry = IOperatorRegistry(diamond);
    riverConfig = IRiverConfig(diamond);
  }

  modifier givenNodeOperatorIsApproved(address nodeOperator) {
    vm.assume(nodeOperator != address(0));
    vm.assume(operatorRegistry.isOperator(nodeOperator) == false);

    vm.prank(deployer);
    vm.expectEmit();
    emit IOperatorRegistry.OperatorAdded(nodeOperator);
    operatorRegistry.approveOperator(nodeOperator);
    _;
  }

  modifier givenNodeIsRegistered(
    address nodeOperator,
    address node,
    string memory url
  ) {
    vm.assume(nodeOperator != address(0));
    vm.assume(node != address(0));

    vm.prank(nodeOperator);
    vm.expectEmit();
    emit INodeRegistry.NodeAdded(node, url, NodeStatus.NotInitialized);
    nodeRegistry.registerNode(node, url, NodeStatus.NotInitialized);
    _;
  }

  modifier givenConfigurationManagerIsApproved(address configManager) {
    vm.assume(configManager != address(0));
    vm.assume(riverConfig.isConfigurationManager(configManager) == false);

    vm.prank(deployer);
    vm.expectEmit();
    emit IRiverConfig.ConfigurationManagerAdded(configManager);
    riverConfig.approveConfigurationManager(configManager);
    _;
  }

  modifier setBytesConfig(
    bytes32 key,
    uint64 blockNumber,
    bytes memory value
  ) {
    vm.assume(key != bytes32(0));
    vm.assume(value.length > 0);

    vm.prank(deployer);
    vm.expectEmit(address(riverConfig));
    emit IRiverConfig.ConfigurationChanged(key, blockNumber, value, false);

    riverConfig.setConfiguration(key, blockNumber, value);
    _;
  }

  // =============================================================
  //                           RegisterNode
  // =============================================================
  function test_registerNode(
    address nodeOperator,
    address node,
    string memory url
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    vm.assume(node != address(0));

    vm.prank(nodeOperator);
    vm.expectEmit();
    emit INodeRegistry.NodeAdded(node, url, NodeStatus.Operational);
    nodeRegistry.registerNode(node, url, NodeStatus.Operational);

    Node memory registered = nodeRegistry.getNode(node);
    assertEq(registered.url, url);
    assertEq(uint(registered.status), uint(NodeStatus.Operational));
    assertEq(registered.operator, nodeOperator);
  }

  // =============================================================
  //                     updateNodeUrl
  // =============================================================
  function test_updateNodeUrl(
    address nodeOperator,
    address node
  )
    external
    givenNodeOperatorIsApproved(nodeOperator)
    givenNodeIsRegistered(nodeOperator, node, "old")
  {
    Node memory previous = nodeRegistry.getNode(node);
    assertEq(previous.url, "old");

    vm.prank(nodeOperator);
    vm.expectEmit();
    emit INodeRegistry.NodeUrlUpdated(node, "new");
    nodeRegistry.updateNodeUrl(node, "new");

    Node memory updated = nodeRegistry.getNode(node);
    assertEq(updated.url, "new");
  }

  // =============================================================
  //                           approveOperator
  // =============================================================

  function test_approveOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    assertTrue(operatorRegistry.isOperator(nodeOperator));
  }

  function test_revertWhen_approveOperatorWithZeroAddress() external {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_ARG));
    operatorRegistry.approveOperator(address(0));
  }

  function test_revertWhen_approveOperatorWithAlreadyApprovedOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.ALREADY_EXISTS));
    operatorRegistry.approveOperator(nodeOperator);
  }

  function test_revertWhen_approveOperatorWithNonOwner(
    address nonOwner,
    address nodeOperator
  ) external {
    vm.assume(nonOwner != address(0));
    vm.assume(nodeOperator != address(0));
    vm.assume(nonOwner != deployer);
    vm.assume(nonOwner != nodeOperator);

    vm.prank(nonOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, nonOwner)
    );
    operatorRegistry.approveOperator(nodeOperator);
  }

  // =============================================================
  //                           removeOperator
  // =============================================================
  function test_removeOperator(
    address nodeOperator
  ) external givenNodeOperatorIsApproved(nodeOperator) {
    assertTrue(operatorRegistry.isOperator(nodeOperator));

    vm.prank(deployer);
    vm.expectEmit();
    emit IOperatorRegistry.OperatorRemoved(nodeOperator);
    operatorRegistry.removeOperator(nodeOperator);

    assertFalse(operatorRegistry.isOperator(nodeOperator));
  }

  function test_revertWhen_removeOperatorWhenOperatorNotFound(
    address nodeOperator
  ) external {
    vm.assume(operatorRegistry.isOperator(nodeOperator) == false);
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.OPERATOR_NOT_FOUND));
    operatorRegistry.removeOperator(nodeOperator);
  }

  // =============================================================
  //                      Configuration
  // =============================================================
  function test_configurationNonExistingKey(bytes32 key) external {
    assertFalse(riverConfig.configurationExists(key));
  }

  function test_configurationExistingKey(
    bytes32 key,
    uint64 blockNumber
  ) external setBytesConfig(key, blockNumber, "hello world!") {
    assertTrue(riverConfig.configurationExists(key));
  }

  function test_configurationSetSettingManyTimesOnSameBlock(
    address configManager,
    bytes32 key,
    uint64 blockNumber
  ) external givenConfigurationManagerIsApproved(configManager) {
    vm.prank(configManager);
    riverConfig.setConfiguration(key, blockNumber, "hello");
    vm.prank(configManager);
    riverConfig.setConfiguration(key, blockNumber, "hello world!");

    Setting[] memory configuration = riverConfig.getAllConfiguration();
    assertEq(configuration.length, 1);
    assertEq(configuration[0].key, key);
    assertEq(configuration[0].blockNumber, blockNumber);
    assertEq(configuration[0].value, "hello world!");
  }

  function test_configurationGetAll(
    address configManager,
    bytes32 key1,
    bytes32 key2,
    bytes32 key3
  ) external givenConfigurationManagerIsApproved(configManager) {
    vm.assume(key1 != key2);
    vm.assume(key1 != key3);
    vm.assume(key2 != key3);

    uint64 count = 75;

    for (uint64 i = 0; i < count; i++) {
      vm.prank(configManager);
      if (i % 3 == 0) {
        riverConfig.setConfiguration(key1, i, abi.encode(i));
      } else if (i % 3 == 1) {
        riverConfig.setConfiguration(key2, i, abi.encode(i));
      } else {
        riverConfig.setConfiguration(key3, i, abi.encode(i));
      }
    }

    Setting[] memory configuration = riverConfig.getAllConfiguration();
    assertEq(configuration.length, count);
  }

  function test_configurationSetUnauthorized(
    bytes32 key,
    uint64 blockNumber,
    address caller
  ) external {
    vm.assume(caller != deployer);
    vm.prank(caller);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));

    riverConfig.setConfiguration(key, blockNumber, "hello world!");
  }

  function test_configurationSetWithInvalidValue(
    bytes32 key,
    uint64 blockNumber
  ) external {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_ARG));

    riverConfig.setConfiguration(key, blockNumber, "");
  }

  function test_configurationDeleteExisting(
    bytes32 key,
    uint64 blockNumber
  ) external setBytesConfig(key, blockNumber, "hello world!") {
    assertTrue(riverConfig.configurationExists(key));

    vm.prank(deployer);
    vm.expectEmit(address(riverConfig));
    emit IRiverConfig.ConfigurationChanged(key, 0, "", true);

    riverConfig.deleteConfiguration(key);
  }

  function test_configurationDeleteFromMany(
    bytes32 key,
    uint64 blockNumberA,
    uint64 blockNumberB,
    uint64 blockNumberC
  )
    external
    setBytesConfig(key, blockNumberA, "AAA")
    setBytesConfig(key, blockNumberB, "BBB")
    setBytesConfig(key, blockNumberC, "CCC")
  {
    vm.assume(blockNumberA != blockNumberB);
    vm.assume(blockNumberA != blockNumberC);
    vm.assume(blockNumberB != blockNumberC);

    assertEq(riverConfig.getAllConfiguration().length, 3);

    vm.prank(deployer);
    vm.expectEmit(address(riverConfig));
    emit IRiverConfig.ConfigurationChanged(key, blockNumberB, "", true);

    riverConfig.deleteConfigurationOnBlock(key, blockNumberB);

    Setting[] memory settings = riverConfig.getAllConfiguration();
    assertEq(settings.length, 2);

    if (settings[0].blockNumber == blockNumberA) {
      assertEq(settings[0].value, "AAA");
      assertEq(settings[1].blockNumber, blockNumberC);
      assertEq(settings[1].value, "CCC");
    } else if (settings[0].blockNumber == blockNumberC) {
      assertEq(settings[0].value, "CCC");
      assertEq(settings[1].blockNumber, blockNumberA);
      assertEq(settings[1].value, "AAA");
    } else {
      assertFalse(true);
    }
  }

  function test_configurationDeleteNonExisting(bytes32 key) external {
    vm.assume(!riverConfig.configurationExists(key));

    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.NOT_FOUND));
    riverConfig.deleteConfiguration(key);
  }

  function test_configurationDeleteUnauthorized(
    bytes32 key,
    uint64 blockNumber,
    address caller
  ) external setBytesConfig(key, blockNumber, "hello world!") {
    vm.assume(caller != deployer);
    assertTrue(riverConfig.configurationExists(key));

    vm.prank(caller);
    vm.expectRevert(bytes(RiverRegistryErrors.BAD_AUTH));

    riverConfig.deleteConfiguration(key);
  }

  function test_configurationGetByKey(
    bytes32 key,
    uint64 blockNumber
  ) external setBytesConfig(key, blockNumber, "hello world!") {
    assertTrue(riverConfig.configurationExists(key));
    Setting[] memory settings = riverConfig.getConfiguration(key);
    assertEq(settings.length, 1);

    Setting memory setting = settings[0];
    assertEq(setting.key, key);
    assertEq(setting.blockNumber, blockNumber);
    assertEq(setting.value, "hello world!");
  }

  function test_configurationGetNonExisting(bytes32 key) external {
    assertFalse(riverConfig.configurationExists(key));
    vm.expectRevert(bytes(RiverRegistryErrors.NOT_FOUND));
    riverConfig.getConfiguration(key);
  }
}
