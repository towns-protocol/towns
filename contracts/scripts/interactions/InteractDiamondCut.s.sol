// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamondCut} from "@river-build/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamond} from "@river-build/diamond/src/Diamond.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// facet
import {DeployRewardsDistributionV2} from "contracts/scripts/deployments/facets/DeployRewardsDistributionV2.s.sol";

contract InteractDiamondCut is Interaction, DiamondHelper {
  DeployRewardsDistributionV2 helper = new DeployRewardsDistributionV2();

  function __interact(address deployer) internal override {
    address diamond = getDeployment("riverRegistry");

    address rewardsDistribution = helper.deploy(deployer);

    addCut(
      helper.makeCut(rewardsDistribution, IDiamond.FacetCutAction.Replace)
    );

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(
      _cuts,
      rewardsDistribution,
      helper.makeInitData(
        0xd47972d8A64Fc4ea4435E31D5c8C3E65BD51e293,
        0xd47972d8A64Fc4ea4435E31D5c8C3E65BD51e293,
        14 days
      )
    );
  }
}
