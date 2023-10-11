// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// helpers
import {Deployer} from "../common/Deployer.s.sol";
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

contract DeployMockNFT is Deployer {
  // helpers
  DiamondCutHelper cutHelper = new DiamondCutHelper();
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

  address multiInit;

  function versionName() public pure override returns (string memory) {
    return "mockNFT";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    address townFactory = getDeployment("townFactory");

    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());
    erc721aMock = address(new MockERC721A());
    multiInit = address(new MultiInit());
    vm.stopBroadcast();

    erc721aMockHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](totalFacets);
    uint256 index;

    cuts[index++] = cutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add);
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

    index = 0;

    addresses[index++] = diamondCut;
    addresses[index++] = diamondLoupe;
    addresses[index++] = introspection;
    addresses[index++] = erc721aMock;

    index = 0;

    payloads[index++] = cutHelper.makeInitData("");
    payloads[index++] = loupeHelper.makeInitData("");
    payloads[index++] = introspectionHelper.makeInitData("");
    payloads[index++] = erc721aMockHelper.makeInitData(
      "MockERC721A",
      "MERC721A"
    );

    vm.startBroadcast(deployerPK);
    address mockERC721A = address(
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: multiInit,
          initData: abi.encodeWithSelector(
            MultiInit.multiInit.selector,
            addresses,
            payloads
          )
        })
      )
    );

    ITownArchitect(townFactory).gateByToken(mockERC721A, 1);
    vm.stopBroadcast();

    return mockERC721A;
  }
}
