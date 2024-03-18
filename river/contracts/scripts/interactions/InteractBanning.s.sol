// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// helpers
import {BanningHelper} from "contracts/test/spaces/banning/BanningHelper.sol";
import {DeployBanning} from "contracts/scripts/deployments/facets/DeployBanning.s.sol";

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

contract InteractBanning is Interaction {
  DeployBanning deployBanning = new DeployBanning();
  BanningHelper banningHelper = new BanningHelper();

  function __interact(uint256 pk, address) public override {
    address space = getDeployment("space");
    address banning = deployBanning.deploy();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = IDiamond.FacetCut({
      facetAddress: banning,
      action: IDiamond.FacetCutAction.Replace,
      functionSelectors: banningHelper.selectors()
    });

    // upgrade banning facet
    vm.startBroadcast(pk);
    IDiamondCut(space).diamondCut({
      facetCuts: cuts,
      init: address(0),
      initPayload: ""
    });
    vm.stopBroadcast();
  }
}
