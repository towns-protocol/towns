// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {ERC721AQueryable} from
    "contracts/src/diamond/facets/token/ERC721A/extensions/ERC721AQueryable.sol";

contract DeployERC721AQueryable is FacetHelper, Deployer {
    constructor() {
        addSelector(ERC721AQueryable.explicitOwnershipOf.selector);
        addSelector(ERC721AQueryable.explicitOwnershipsOf.selector);
        addSelector(ERC721AQueryable.tokensOfOwnerIn.selector);
        addSelector(ERC721AQueryable.tokensOfOwner.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/erc721AQueryableFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        ERC721AQueryable facet = new ERC721AQueryable();
        vm.stopBroadcast();
        return address(facet);
    }
}
