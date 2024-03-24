// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondLoupe} from "contracts/src/diamond/facets/loupe/IDiamondLoupe.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {DeployNodeOperator} from "contracts/scripts/deployments/facets/DeployNodeOperator.s.sol";
import {NodeOperatorHelper} from "contracts/test/base/registry/NodeOperatorHelper.sol";

contract InteractBaseRegistry is Interaction {
  NodeOperatorHelper nodeOperatorHelper = new NodeOperatorHelper();
  DeployNodeOperator deployNodeOperator = new DeployNodeOperator();

  function __interact(uint256 pk, address) public override {
    address registry = getDeployment("baseRegistry");
    address oldNodeOperator = getDeployment("nodeOperatorFacet");

    bytes4[] memory oldSelectors = IDiamondLoupe(registry)
      .facetFunctionSelectors(oldNodeOperator);

    address nodeOperator = deployNodeOperator.deploy();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = IDiamond.FacetCut({
      facetAddress: oldNodeOperator,
      action: IDiamond.FacetCutAction.Remove,
      functionSelectors: oldSelectors
    });
    cuts[1] = IDiamond.FacetCut({
      facetAddress: nodeOperator,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: nodeOperatorHelper.selectors()
    });

    vm.startBroadcast(pk);
    IDiamondCut(registry).diamondCut({
      facetCuts: cuts,
      init: address(0),
      initPayload: ""
    });
    vm.stopBroadcast();
  }
}
