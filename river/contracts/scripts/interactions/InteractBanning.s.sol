// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

// helpers
import {DeployBanning} from "contracts/scripts/deployments/facets/DeployBanning.s.sol";

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

contract InteractBanning is Interaction {
  DeployBanning banningHelper = new DeployBanning();

  function __interact(address deployer) public override {
    address space = getDeployment("space");
    address banning = banningHelper.deploy();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = IDiamond.FacetCut({
      facetAddress: 0xf3Bf5f6bF0811ABebFc04A46c1631dcbe33D7Bb8,
      action: IDiamond.FacetCutAction.Remove,
      functionSelectors: banningHelper.selectors()
    });
    cuts[1] = IDiamond.FacetCut({
      facetAddress: banning,
      action: IDiamond.FacetCutAction.Add,
      functionSelectors: banningHelper.selectors()
    });

    // upgrade banning facet
    vm.startBroadcast(deployer);
    IDiamondCut(space).diamondCut({
      facetCuts: cuts,
      init: address(0),
      initPayload: ""
    });
    vm.stopBroadcast();
  }
}
