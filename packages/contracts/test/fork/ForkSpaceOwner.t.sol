// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// interfaces

import {Diamond, IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IArchitect, IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {ISpaceOwnerBase} from "src/spaces/facets/owner/ISpaceOwner.sol";

// libraries
import {DeploySpaceOwnerFacet} from "scripts/deployments/facets/DeploySpaceOwnerFacet.s.sol";

// contracts
import {DiamondCutFacet} from "@towns-protocol/diamond/src/facets/cut/DiamondCutFacet.sol";

import {DeployArchitect} from "scripts/deployments/facets/DeployArchitect.s.sol";
import {SpaceOwner} from "src/spaces/facets/owner/SpaceOwner.sol";
import {SpaceHelper} from "test/spaces/SpaceHelper.sol";

import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";

contract ForkSpaceOwner is IArchitectBase, ISpaceOwnerBase, TestUtils, SpaceHelper {
    address internal constant DEPLOYER_ADDRESS = 0x9f2667b9Ec9a7d09A47D87156f032c6735a077Ad;
    address internal constant GOVERNANCE_ADDRESS = 0x63217D4c321CC02Ed306cB3843309184D347667B;

    address spaceOwnerDiamond = 0x2824D1235d1CbcA6d61C00C3ceeCB9155cd33a42;
    address spaceFactory = 0x9978c826d93883701522d2CA645d5436e5654252;

    function setUp() external onlyForked {
        // create diamond cut to current space owner
        address spaceOwnerFacet = DeploySpaceOwnerFacet.deploy();
        address architectFacet = DeployArchitect.deploy();

        bytes4[] memory addSelectors = new bytes4[](2);
        addSelectors[0] = SpaceOwner.mintSpace.selector;
        addSelectors[1] = SpaceOwner.updateSpaceInfo.selector;

        bytes4[] memory replaceSelectors = new bytes4[](1);
        replaceSelectors[0] = SpaceOwner.getSpaceInfo.selector;

        IDiamond.FacetCut[] memory cut = new IDiamond.FacetCut[](2);

        cut[0] = IDiamond.FacetCut({
            facetAddress: spaceOwnerFacet,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: addSelectors
        });
        cut[1] = IDiamond.FacetCut({
            facetAddress: spaceOwnerFacet,
            action: IDiamond.FacetCutAction.Replace,
            functionSelectors: replaceSelectors
        });

        DiamondCutFacet diamondCut = DiamondCutFacet(spaceOwnerDiamond);

        vm.prank(DEPLOYER_ADDRESS);
        diamondCut.diamondCut(cut, address(0), new bytes(0));

        bytes4[] memory architectSelectors = new bytes4[](1);
        architectSelectors[0] = 0xf822028d; // createSpace(SpaceInfo)
        IDiamond.FacetCut[] memory architectCut = new IDiamond.FacetCut[](1);
        architectCut[0] = IDiamond.FacetCut({
            facetAddress: architectFacet,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: architectSelectors
        });

        DiamondCutFacet architectDiamondCut = DiamondCutFacet(spaceFactory);

        vm.prank(GOVERNANCE_ADDRESS);
        architectDiamondCut.diamondCut(architectCut, address(0), new bytes(0));
    }

    function test_createForkSpace() external onlyForked {
        address founder = _randomAddress();

        SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo("fork-space");
        spaceInfo.membership.settings.pricingModule = 0x7E49Fcec32E060a3D710d568B249c0ED69f01005;

        ICreateSpace spaceArchitect = ICreateSpace(spaceFactory);

        vm.prank(founder);
        spaceArchitect.createSpace(spaceInfo);
    }

    function test_getSpaceInfo() external view onlyForked {
        Space memory space = SpaceOwner(spaceOwnerDiamond).getSpaceInfo(
            0xC87bb04477151743070B45A3426938128896AC5D
        );
        assertTrue(bytes(space.shortDescription).length == 0, "Short description is not empty");
    }
}
