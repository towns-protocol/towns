// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

import {PioneerFacet} from "contracts/src/tokens/pioneer/PioneerFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";

import {PioneerHelper} from "contracts/test/tokens/pioneer/PioneerSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployPioneer is DiamondDeployer {
  DiamondLoupeHelper diamondLoupeHelper = new DiamondLoupeHelper();
  DiamondCutHelper diamondCutHelper = new DiamondCutHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  PioneerHelper pioneerHelper = new PioneerHelper();

  function versionName() public pure override returns (string memory) {
    return "pioneerToken";
  }

  function diamondInitParams(
    uint256 deployerPrivateKey,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    vm.startBroadcast(deployerPrivateKey);
    DiamondLoupeFacet diamondLoupe = new DiamondLoupeFacet();
    DiamondCutFacet diamondCut = new DiamondCutFacet();
    OwnableFacet ownable = new OwnableFacet();
    IntrospectionFacet introspection = new IntrospectionFacet();
    PioneerFacet pioneer = new PioneerFacet();
    MultiInit multiInit = new MultiInit();
    vm.stopBroadcast();

    pioneerHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](5);

    cuts[index++] = diamondLoupeHelper.makeCut(
      address(diamondLoupe),
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = diamondCutHelper.makeCut(
      address(diamondCut),
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = ownableHelper.makeCut(
      address(ownable),
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = introspectionHelper.makeCut(
      address(introspection),
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = pioneerHelper.makeCut(
      address(pioneer),
      IDiamond.FacetCutAction.Add
    );

    _resetIndex();

    address[] memory addresses = new address[](5);
    bytes[] memory payloads = new bytes[](5);

    addresses[index++] = address(diamondLoupe);
    addresses[index++] = address(diamondCut);
    addresses[index++] = address(ownable);
    addresses[index++] = address(introspection);
    addresses[index++] = address(pioneer);

    _resetIndex();

    payloads[index++] = diamondLoupeHelper.makeInitData("");
    payloads[index++] = diamondCutHelper.makeInitData("");
    payloads[index++] = ownableHelper.makeInitData(abi.encode(deployer));
    payloads[index++] = introspectionHelper.makeInitData("");
    payloads[index++] = pioneerHelper.makeInitData(
      "Pioneer",
      "PIONEER",
      "https://towns.com/",
      0.1 ether,
      deployer
    );

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          multiInit.multiInit.selector,
          addresses,
          payloads
        )
      });
  }

  function _afterDeployment(
    uint256 pk,
    address,
    address diamond
  ) internal override {
    // send eth to diamond
    vm.broadcast(pk);
    (bool success, ) = diamond.call{value: 1 ether}("");
    require(success, "failed to send eth to diamond");
  }
}
