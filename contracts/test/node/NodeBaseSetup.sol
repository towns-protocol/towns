// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {NodeRegistryFacet} from "contracts/src/node/registry/NodeRegistryFacet.sol";
import {NodeOperatorFacet} from "contracts/src/node/operator/NodeOperatorFacet.sol";
import {NodeStatusFacet} from "contracts/src/node/status/NodeStatusFacet.sol";
import {AccessControlListFacet} from "contracts/src/node/acl/AccessControlListFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";

// deployments
import {DeployNodeRegistry} from "contracts/scripts/deployments/DeployNodeRegistry.s.sol";

abstract contract NodeBaseSetup is TestUtils {
  DeployNodeRegistry internal deployNodeRegistry = new DeployNodeRegistry();

  NodeRegistryFacet internal nodeRegistryFacet;
  NodeOperatorFacet internal nodeOperatorFacet;
  NodeStatusFacet internal serviceStatusFacet;
  AccessControlListFacet internal accessControlListFacet;
  OwnableFacet internal ownableFacet;

  address deployer;

  function setUp() public virtual {
    deployer = getDeployer();

    address diamond = deployNodeRegistry.deploy();

    nodeOperatorFacet = NodeOperatorFacet(diamond);
    nodeRegistryFacet = NodeRegistryFacet(diamond);
    serviceStatusFacet = NodeStatusFacet(diamond);
    accessControlListFacet = AccessControlListFacet(diamond);
    ownableFacet = OwnableFacet(diamond);
  }
}
