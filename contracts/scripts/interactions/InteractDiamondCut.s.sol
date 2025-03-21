// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

//libraries
import {console} from "forge-std/console.sol";

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";

// facet
import {DeployWalletLink} from "contracts/scripts/deployments/facets/DeployWalletLink.s.sol";
import {WalletLink} from "contracts/src/factory/facets/wallet-link/WalletLink.sol";

contract InteractDiamondCut is Interaction, AlphaHelper {
  DeployWalletLink helper = new DeployWalletLink();

  function __interact(address deployer) internal override {
    address diamond = getDeployment("spaceFactory");
    address walletLink = getDeployment("walletLinkFacet");

    address[] memory facetAddresses = new address[](1);
    facetAddresses[0] = walletLink;

    // add the diamond cut to remove the facet
    addCutsToRemove(diamond, facetAddresses);

    // deploy the new facet
    console.log("deployer", deployer);
    vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
    address deployedAddr = helper.deploy(deployer);

    // add the new facet to the diamond
    addCut(helper.makeCut(deployedAddr, IDiamond.FacetCutAction.Add));

    bytes memory initData = "";

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(
      baseFacets(),
      initData.length > 0 ? deployedAddr : address(0),
      initData
    );
  }
}
