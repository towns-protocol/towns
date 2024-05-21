// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {INodeRegistry, INodeRegistryBase, NodeStatus} from "contracts/src/river/registry/facets/node/INodeRegistry.sol";
import {IOperatorRegistry} from "contracts/src/river/registry/facets/operator/IOperatorRegistry.sol";
import {IStreamRegistry} from "contracts/src/river/registry/facets/stream/IStreamRegistry.sol";
import {IRiverConfig} from "contracts/src/river/registry/facets/config/IRiverConfig.sol";

// structs

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

// deployments
import {DeployRiverRegistry} from "contracts/scripts/deployments/DeployRiverRegistry.s.sol";

contract RiverRegistryBaseSetup is TestUtils {
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
    emit INodeRegistryBase.NodeAdded(node, url, NodeStatus.NotInitialized);
    nodeRegistry.registerNode(node, url, NodeStatus.NotInitialized);
    _;
  }
}
