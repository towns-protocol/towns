// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {NodeOperatorFacet} from "contracts/src/node/operator/NodeOperatorFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";

// deployments
import {DeployNodeRegistry} from "contracts/scripts/deployments/DeployNodeRegistry.s.sol";

abstract contract NodeBaseSetup is TestUtils {
  DeployNodeRegistry internal deployNodeRegistry = new DeployNodeRegistry();

  NodeOperatorFacet internal operator;
  OwnableFacet internal ownable;
  IntrospectionFacet internal introspection;
  ERC721A internal erc721;

  address deployer;

  function setUp() public virtual {
    deployer = getDeployer();

    address diamond = deployNodeRegistry.deploy();

    operator = NodeOperatorFacet(diamond);
    ownable = OwnableFacet(diamond);
    introspection = IntrospectionFacet(diamond);
    erc721 = ERC721A(diamond);
  }
}
