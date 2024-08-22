// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupe, IDiamondLoupeBase} from "contracts/src/diamond/facets/loupe/IDiamondLoupe.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IOwnablePending} from "contracts/src/diamond/facets/ownable/pending/IOwnablePending.sol";

import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

import {DeploySpace} from "contracts/scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceFactory} from "contracts/scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/diamonds/DeploySpaceOwner.s.sol";

contract InteractAlpha is Interaction, DiamondHelper, IDiamondLoupeBase {
  DeploySpace deploySpace = new DeploySpace();
  DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();

  function __interact(address deployer) internal override {
    vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");
    address space = getDeployment("space");
    address spaceOwner = getDeployment("spaceOwner");
    address spaceFactory = getDeployment("spaceFactory");
    address baseRegistry = getDeployment("baseRegistry");

    FacetCut[] memory newCuts;

    removeRemoteFacets(deployer, space);
    removeRemoteFacets(deployer, spaceOwner);
    removeRemoteFacets(deployer, spaceFactory);
    removeRemoteFacets(deployer, baseRegistry);

    // Deploy Space
    deploySpace.diamondInitParams(deployer);
    newCuts = deploySpace.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(space).diamondCut(newCuts, address(0), "");

    // Deploy Space Owner
    deploySpaceOwner.diamondInitParams(deployer);
    newCuts = deploySpaceOwner.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(spaceOwner).diamondCut(newCuts, address(0), "");

    // Deploy Space Factory
    deploySpaceFactory.diamondInitParams(deployer);
    newCuts = deploySpaceFactory.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(spaceFactory).diamondCut(newCuts, address(0), "");

    // Deploy Base Registry
    deployBaseRegistry.diamondInitParams(deployer);
    newCuts = deployBaseRegistry.getCuts();
    vm.broadcast(deployer);
    IDiamondCut(baseRegistry).diamondCut(newCuts, address(0), "");
  }

  function removeRemoteFacets(address deployer, address diamond) internal {
    Facet[] memory facets = IDiamondLoupe(diamond).facets();

    address diamondCut = IDiamondLoupe(diamond).facetAddress(
      IDiamondCut.diamondCut.selector
    );
    address diamondLoupe = IDiamondLoupe(diamond).facetAddress(
      IDiamondLoupe.facets.selector
    );
    address introspection = IDiamondLoupe(diamond).facetAddress(
      IERC165.supportsInterface.selector
    );
    address ownable = IDiamondLoupe(diamond).facetAddress(
      IERC173.owner.selector
    );
    address ownablePending = IDiamondLoupe(diamond).facetAddress(
      IOwnablePending.currentOwner.selector
    );

    for (uint256 i; i < facets.length; i++) {
      if (
        facets[i].facet == diamondCut ||
        facets[i].facet == diamondLoupe ||
        facets[i].facet == introspection ||
        facets[i].facet == ownable ||
        facets[i].facet == ownablePending
      ) {
        info("Skipping facet: %s", facets[i].facet);
        continue;
      }

      addCut(
        FacetCut({
          facetAddress: facets[i].facet,
          action: FacetCutAction.Remove,
          functionSelectors: facets[i].selectors
        })
      );
    }

    vm.broadcast(deployer);
    IDiamondCut(diamond).diamondCut(baseFacets(), address(0), "");

    clearCuts();
  }
}
