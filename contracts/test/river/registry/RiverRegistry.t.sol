// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRiverRegistryBase, RiverRegistryErrors} from "contracts/src/river/registry/IRiverRegistry.sol";

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {RiverRegistry} from "contracts/src/river/registry/RiverRegistry.sol";

// deployments
import {DeployRiverRegistry} from "contracts/scripts/deployments/DeployRiverRegistry.s.sol";

contract RiverRegistryTest is TestUtils, IRiverRegistryBase {
  DeployRiverRegistry internal deployRiverRegistry = new DeployRiverRegistry();

  RiverRegistry internal riverRegistry;

  address deployer;

  function setUp() public virtual {
    deployer = getDeployer();
    riverRegistry = RiverRegistry(deployRiverRegistry.deploy());
  }

  modifier givenNodeIsRegistered(address node, string memory url) {
    vm.prank(deployer);
    vm.expectEmit();
    emit NodeAdded(node, url);
    riverRegistry.addNode(node, url);
    _;
  }

  function test_addNode(
    address nodeAddress,
    string memory url
  ) external givenNodeIsRegistered(nodeAddress, url) {
    Node memory node = riverRegistry.getNode(nodeAddress);

    assertEq(node.nodeAddress, nodeAddress);
    assertEq(node.url, url);

    Node[] memory nodes = riverRegistry.getAllNodes();

    for (uint256 i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeAddress == nodeAddress) {
        assertEq(nodes[i].nodeAddress, nodeAddress);
        assertEq(nodes[i].url, url);
      }
    }
  }

  function test_revertWhen_addNodeWithAlreadyRegisteredNode(
    address nodeAddress,
    string memory url
  ) external givenNodeIsRegistered(nodeAddress, url) {
    vm.prank(deployer);
    vm.expectRevert(bytes(RiverRegistryErrors.AlreadyExists));
    riverRegistry.addNode(nodeAddress, url);
  }
}
