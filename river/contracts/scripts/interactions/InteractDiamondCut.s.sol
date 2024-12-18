// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {DeployTokenMigration} from "contracts/scripts/deployments/facets/DeployTokenMigration.s.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

contract InteractDiamondCut is Interaction, DiamondHelper {
  DeployTokenMigration tokenMigrationHelper = new DeployTokenMigration();

  function __interact(address deployer) internal override {
    address diamond = getDeployment("riverMigration");

    address tokenMigration = tokenMigrationHelper.deploy(deployer);

    addCut(
      tokenMigrationHelper.makeCut(
        tokenMigration,
        IDiamond.FacetCutAction.Replace
      )
    );

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(_cuts, address(0), "");
  }
}
