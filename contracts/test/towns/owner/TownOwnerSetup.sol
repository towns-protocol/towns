// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// helpers
import {FacetTest, FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";

import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {VotesHelper} from "contracts/test/governance/votes/VotesSetup.sol";
import {GuardianHelper} from "contracts/test/towns/guardian/GuardianSetup.sol";

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
    address owner
  ) public returns (Diamond.InitParams memory) {
    OwnableHelper ownableHelper = new OwnableHelper();
    GuardianHelper guardianHelper = new GuardianHelper();

    ERC721AHelper erc721aHelper = new ERC721AHelper();
    VotesHelper votesHelper = new VotesHelper();
    TownOwnerHelper townOwnerHelper = new TownOwnerHelper();

    MultiInit multiInit = new MultiInit();

    townOwnerHelper.addSelectors(votesHelper.selectors());
    townOwnerHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);
    uint256 index;

    cuts[index++] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = townOwnerHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = guardianHelper.makeCut(IDiamond.FacetCutAction.Add);

    index = 0;

    address[] memory addresses = new address[](3);
    addresses[index++] = ownableHelper.facet();
    addresses[index++] = townOwnerHelper.facet();
    addresses[index++] = guardianHelper.facet();

    index = 0;

    bytes[] memory payloads = new bytes[](3);
    payloads[index++] = ownableHelper.makeInitData(owner);
    payloads[index++] = townOwnerHelper.makeInitData("TownOwner", "OWNER", "1");
    payloads[index++] = guardianHelper.makeInitData(7 days);

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

contract TownOwnerHelper is FacetHelper {
  TownOwner internal townOwner;

  constructor() {
    townOwner = new TownOwner();

    bytes4[] memory selectors_ = new bytes4[](6);
    uint256 index;

    // TownOwner
    selectors_[index++] = TownOwner.setFactory.selector;
    selectors_[index++] = TownOwner.getFactory.selector;
    selectors_[index++] = TownOwner.mintTown.selector;
    selectors_[index++] = TownOwner.getTownInfo.selector;
    selectors_[index++] = TownOwner.nextTokenId.selector;
    selectors_[index++] = TownOwner.updateTownInfo.selector;
    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(townOwner);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public view virtual override returns (bytes4) {
    return townOwner.__TownOwner_init.selector;
  }

  function makeInitData(
    string memory name,
    string memory symbol,
    string memory version
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        TownOwner.__TownOwner_init.selector,
        name,
        symbol,
        version
      );
  }
}
