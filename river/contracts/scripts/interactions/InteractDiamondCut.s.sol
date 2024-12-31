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
import {DeployStreamRegistry} from "contracts/scripts/deployments/facets/DeployStreamRegistry.s.sol";

contract InteractDiamondCut is Interaction, DiamondHelper {
  DeployStreamRegistry streamRegistryHelper = new DeployStreamRegistry();

  function __interact(address deployer) internal override {
    address diamond = getDeployment("riverRegistry");

    address streamRegistry = streamRegistryHelper.deploy(deployer);

    addCut(
      streamRegistryHelper.makeCut(
        streamRegistry,
        IDiamond.FacetCutAction.Replace
      )
    );

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(_cuts, address(0), "");
  }
}
