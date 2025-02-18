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
import {DeployRiverRegistry} from "contracts/scripts/deployments/diamonds/DeployRiverRegistry.s.sol";

contract RiverRegistryBaseSetup is TestUtils {
  DeployRiverRegistry internal deployRiverRegistry = new DeployRiverRegistry();

  address deployer;
  address diamond;

  INodeRegistry internal nodeRegistry;
  IStreamRegistry internal streamRegistry;
  IOperatorRegistry internal operatorRegistry;
  IRiverConfig internal riverConfig;

  struct TestNode {
    address node;
    string url;
  }

  struct TestStream {
    bytes32 streamId;
    bytes32 genesisMiniblockHash;
    bytes genesisMiniblock;
  }

  function setUp() public virtual {
    deployer = getDeployer();
    diamond = deployRiverRegistry.deploy(deployer);

    nodeRegistry = INodeRegistry(diamond);
    streamRegistry = IStreamRegistry(diamond);
    operatorRegistry = IOperatorRegistry(diamond);
    riverConfig = IRiverConfig(diamond);
  }

  modifier givenNodeOperatorIsApproved(address nodeOperator) {
    _approveNodeOperator(nodeOperator);
    _;
  }

  function _approveNodeOperator(address nodeOperator) internal {
    vm.assume(nodeOperator != address(0));
    vm.assume(operatorRegistry.isOperator(nodeOperator) == false);

    vm.prank(deployer);
    vm.expectEmit(address(operatorRegistry));
    emit IOperatorRegistry.OperatorAdded(nodeOperator);
    operatorRegistry.approveOperator(nodeOperator);
  }

  modifier givenNodeIsRegistered(
    address nodeOperator,
    address node,
    string memory url
  ) {
    _registerNode(nodeOperator, node, url);
    _;
  }

  modifier givenNodesAreRegistered(
    address nodeOperator,
    TestNode[100] memory nodes
  ) {
    uint256 nodesLength = nodes.length;
    for (uint256 i; i < nodesLength; ++i) {
      vm.assume(nodeRegistry.isNode(nodes[i].node) == false);
      _registerNode(nodeOperator, nodes[i].node, nodes[i].url);
    }
    _;
  }

  function _registerNode(
    address nodeOperator,
    address node,
    string memory url
  ) internal {
    vm.assume(node != address(0));
    vm.assume(nodeOperator != address(0));

    vm.prank(nodeOperator);
    vm.expectEmit(address(nodeRegistry));
    emit INodeRegistryBase.NodeAdded(
      node,
      nodeOperator,
      url,
      NodeStatus.NotInitialized
    );
    nodeRegistry.registerNode(node, url, NodeStatus.NotInitialized);
  }
}
