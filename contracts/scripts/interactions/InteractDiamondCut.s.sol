// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {console} from "forge-std/console.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";

// facet
import {DeployEIP712Facet} from
    "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeploySpaceOwnerFacet} from
    "contracts/scripts/deployments/facets/DeploySpaceOwnerFacet.s.sol";

contract InteractDiamondCut is Interaction, AlphaHelper {
    DeploySpaceOwnerFacet spaceOwnerHelper = new DeploySpaceOwnerFacet();

    function __interact(address deployer) internal override {
        address diamond = getDeployment("spaceOwner");
        //    address spaceOwnerFacet = getDeployment("spaceOwnerFacet");
        //    address eip712Facet = getDeployment("eip712Facet");
        address spaceOwnerFacet = 0x09FCbC926F9Ec236fa3f825bF65b62776a9413aD;

        address[] memory facetAddresses = new address[](1);
        facetAddresses[0] = spaceOwnerFacet;
        //    facetAddresses[1] = eip712Facet;

        // add the diamond cut to remove the facet
        addCutsToRemove(diamond, facetAddresses);

        // deploy the new facet
        console.log("deployer", deployer);
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
        spaceOwnerFacet = spaceOwnerHelper.deploy(deployer);
        vm.broadcast(deployer);
        address eip712Facet = DeployEIP712Facet.deploy();

        // add the new facet to the diamond
        addCut(spaceOwnerHelper.makeCut(spaceOwnerFacet, FacetCutAction.Add));
        addCut(DeployEIP712Facet.makeCut(eip712Facet, FacetCutAction.Add));

        bytes memory initData = DeployEIP712Facet.makeInitData("Space Owner", "1");

        vm.broadcast(deployer);
        IDiamondCut(diamond).diamondCut(baseFacets(), eip712Facet, initData);
    }
}
