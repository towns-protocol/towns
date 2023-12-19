// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// helpers
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// mocks
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {ERC721AMockHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

// contracts
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {MockERC721A} from "contracts/test/mocks/MockERC721A.sol";

contract DeployMockNFT is DiamondDeployer {
  // helpers
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  ERC721AMockHelper erc721aMockHelper = new ERC721AMockHelper();

  uint256 totalFacets = 4;
  uint256 totalInit = 4;

  address[] addresses = new address[](totalInit);
  bytes[] payloads = new bytes[](totalInit);

  address diamondCut;
  address diamondLoupe;
  address introspection;
  address erc721aMock;

  function versionName() public pure override returns (string memory) {
    return "mockNFT";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address
  ) public override returns (Diamond.InitParams memory) {
    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());
    erc721aMock = address(new MockERC721A());
    vm.stopBroadcast();

    erc721aMockHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](totalFacets);

    cuts[index++] = diamondCutHelper.makeCut(
      diamondCut,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = loupeHelper.makeCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = introspectionHelper.makeCut(
      introspection,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = erc721aMockHelper.makeCut(
      erc721aMock,
      IDiamond.FacetCutAction.Add
    );

    _resetIndex();

    addresses[index++] = diamondCut;
    addresses[index++] = diamondLoupe;
    addresses[index++] = introspection;
    addresses[index++] = erc721aMock;

    _resetIndex();

    payloads[index++] = diamondCutHelper.makeInitData("");
    payloads[index++] = loupeHelper.makeInitData("");
    payloads[index++] = introspectionHelper.makeInitData("");
    payloads[index++] = erc721aMockHelper.makeInitData(
      "MockERC721A",
      "MERC721A"
    );

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: getDeployment("multiInit"),
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          addresses,
          payloads
        )
      });
  }
}
