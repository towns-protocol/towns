// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";

// libraries
import {console} from "forge-std/console.sol";
import {DeployTipping} from "../deployments/facets/DeployTipping.s.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {AlphaHelper} from "./helpers/AlphaHelper.sol";

contract InteractSpace is Interaction, AlphaHelper {
    function __interact(address deployer) internal override {
        // Get the deployed Space diamond address
        address space = getDeployment("space");

        console.log("Space Diamond:", space);

        // Deploy new TippingFacet implementation
        console.log("\n=== Deploying TippingFacet ===");
        vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");

        address tippingFacet = DeployTipping.deploy();
        console.log("TippingFacet deployed at:", tippingFacet);

        // Add the cut for replacing the existing facet implementation
        addCut(DeployTipping.makeCut(tippingFacet, FacetCutAction.Replace));

        // Execute the diamond cut without initialization
        console.log("\n=== Executing Diamond Cut to Replace TippingFacet ===");
        vm.broadcast(deployer);
        IDiamondCut(space).diamondCut(baseFacets(), address(0), "");

        console.log("\n=== Diamond Cut Complete ===");
        console.log("TippingFacet successfully updated on Space diamond");
    }
}
