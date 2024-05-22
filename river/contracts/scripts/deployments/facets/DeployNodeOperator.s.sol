// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";

contract DeployNodeOperator is Deployer, FacetHelper {
  constructor() {
    addSelector(NodeOperatorFacet.registerOperator.selector);
    addSelector(NodeOperatorFacet.isOperator.selector);
    addSelector(NodeOperatorFacet.setOperatorStatus.selector);
    addSelector(NodeOperatorFacet.getOperatorStatus.selector);
    addSelector(NodeOperatorFacet.setCommissionRate.selector);
    addSelector(NodeOperatorFacet.getCommissionRate.selector);
    addSelector(NodeOperatorFacet.setClaimAddressForOperator.selector);
    addSelector(NodeOperatorFacet.getClaimAddressForOperator.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return NodeOperatorFacet.__NodeOperator_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "nodeOperatorFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    NodeOperatorFacet nodeOperatorFacet = new NodeOperatorFacet();
    vm.stopBroadcast();
    return address(nodeOperatorFacet);
  }
}
