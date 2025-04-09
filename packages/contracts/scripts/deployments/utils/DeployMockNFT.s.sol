// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// helpers
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

// mocks
import {DeployMockERC721A} from "scripts/deployments/utils/DeployMockERC721A.s.sol";

// contracts
import {DeployDiamondCut} from "scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMultiInit} from "scripts/deployments/utils/DeployMultiInit.s.sol";

contract DeployMockNFT is DiamondHelper, Deployer {
    DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
    DeployDiamondLoupe loupeHelper = new DeployDiamondLoupe();
    DeployIntrospection introspectionHelper = new DeployIntrospection();
    DeployMultiInit multiInitHelper = new DeployMultiInit();

    DeployMockERC721A mockERC721Helper = new DeployMockERC721A();

    address diamondCut;
    address diamondLoupe;
    address introspection;
    address erc721aMock;

    function versionName() public pure override returns (string memory) {
        return "utils/mockNFT";
    }

    function diamondInitParams(address deployer) internal returns (Diamond.InitParams memory) {
        address multiInit = multiInitHelper.deploy(deployer);
        diamondCut = diamondCutHelper.deploy(deployer);
        diamondLoupe = loupeHelper.deploy(deployer);
        introspection = introspectionHelper.deploy(deployer);
        erc721aMock = mockERC721Helper.deploy(deployer);

        addFacet(
            diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            diamondCutHelper.makeInitData("")
        );
        addFacet(
            loupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            loupeHelper.makeInitData("")
        );
        addFacet(
            introspectionHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            introspection,
            introspectionHelper.makeInitData("")
        );
        addCut(mockERC721Helper.makeCut(erc721aMock, IDiamond.FacetCutAction.Add));

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeWithSelector(
                    MultiInit.multiInit.selector,
                    _initAddresses,
                    _initDatas
                )
            });
    }

    function __deploy(address deployer) internal override returns (address) {
        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);
        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
