// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract TownOwnerSetup is FacetTest {
  TownOwner internal townOwner;

  function setUp() public override {
    super.setUp();
    townOwner = TownOwner(diamond);

    vm.prank(deployer);
    townOwner.setFactory(deployer);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    TownOwnerImplementation townOwnerImplementation = new TownOwnerImplementation();
    return townOwnerImplementation.diamondInitParams(deployer);
  }
}

contract TownOwnerImplementation {
  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
    OwnableHelper ownableHelper = new OwnableHelper();
    TownOwnerHelper townOwnerHelper = new TownOwnerHelper();
    MultiInit multiInit = new MultiInit();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = townOwnerHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](2);
    addresses[0] = ownableHelper.facet();
    addresses[1] = townOwnerHelper.facet();

    bytes[] memory payloads = new bytes[](2);
    payloads[0] = ownableHelper.makeInitData(abi.encode(deployer));
    payloads[1] = townOwnerHelper.makeInitData("TownOwner", "OWNER");

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

contract TownOwnerHelper is ERC721AHelper {
  TownOwner internal townOwner;

  constructor() {
    townOwner = new TownOwner();
  }

  function facet() public view override returns (address) {
    return address(townOwner);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory currentSelectors_ = super.selectors();
    bytes4[] memory selectors_ = new bytes4[](currentSelectors_.length + 5);
    uint256 index;

    for (uint256 i = 0; i < currentSelectors_.length; i++) {
      selectors_[index++] = currentSelectors_[i];
    }

    // TownOwner
    selectors_[index++] = TownOwner.setFactory.selector;
    selectors_[index++] = TownOwner.getFactory.selector;
    selectors_[index++] = TownOwner.mintTown.selector;
    selectors_[index++] = TownOwner.getTownInfo.selector;
    selectors_[index++] = TownOwner.nextTokenId.selector;
    return selectors_;
  }

  function creationCode() public pure virtual returns (bytes memory) {
    return type(TownOwner).creationCode;
  }
}
