// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// contracts
import {PioneerFacet} from "contracts/src/tokens/pioneer/PioneerFacet.sol";

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";

import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract PioneerSetup is FacetTest {
  PioneerFacet internal pioneer;

  function setUp() public override {
    super.setUp();
    pioneer = PioneerFacet(diamond);

    vm.deal(diamond, 5 ether);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    OwnableHelper ownableHelper = new OwnableHelper();
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();
    ERC721AHelper erc721aHelper = new ERC721AHelper();
    PioneerHelper pioneerHelper = new PioneerHelper();
    MultiInit multiInit = new MultiInit();

    pioneerHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);
    cuts[0] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = pioneerHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](3);
    bytes[] memory payloads = new bytes[](3);

    addresses[0] = address(ownableHelper.facet());
    addresses[1] = address(introspectionHelper.facet());
    addresses[2] = address(pioneerHelper.facet());

    payloads[0] = ownableHelper.makeInitData(abi.encode(deployer));
    payloads[1] = introspectionHelper.makeInitData("");
    payloads[2] = pioneerHelper.makeInitData(
      "Pioneer",
      "PIONEER",
      "https://towns.com",
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
}

contract PioneerHelper is FacetHelper {
  PioneerFacet internal pioneer;

  constructor() {
    pioneer = new PioneerFacet();

    uint256 index;
    bytes4[] memory selectors_ = new bytes4[](6);
    selectors_[index++] = pioneer.mintTo.selector;
    selectors_[index++] = pioneer.withdraw.selector;
    selectors_[index++] = pioneer.setAllowed.selector;
    selectors_[index++] = pioneer.setBaseURI.selector;
    selectors_[index++] = pioneer.setMintReward.selector;
    selectors_[index++] = pioneer.getMintReward.selector;
    addSelectors(selectors_);
  }

  function facet() public view virtual override returns (address) {
    return address(pioneer);
  }

  function initializer() public view virtual override returns (bytes4) {
    return pioneer.__Pioneer_init.selector;
  }

  function selectors() public virtual override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function makeInitData(
    string memory name,
    string memory symbol,
    string memory baseURI,
    uint256 mintReward,
    address owner
  ) public view returns (bytes memory) {
    return
      abi.encodeWithSelector(
        initializer(),
        name,
        symbol,
        baseURI,
        mintReward,
        owner
      );
  }
}
