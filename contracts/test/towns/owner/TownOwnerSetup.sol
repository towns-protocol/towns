// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

abstract contract TownOwnerSetup is FacetTest {
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
    payloads[1] = abi.encodeWithSelector(
      townOwnerHelper.initializer(),
      "TownOwner",
      "OWNER"
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

contract TownOwnerHelper is FacetHelper {
  TownOwner internal townOwner;

  constructor() {
    townOwner = new TownOwner();
  }

  function facet() public view override returns (address) {
    return address(townOwner);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](17);
    uint256 index;

    // ERC721A
    selectors_[index++] = IERC721A.totalSupply.selector;
    selectors_[index++] = IERC721A.balanceOf.selector;
    selectors_[index++] = IERC721A.ownerOf.selector;
    selectors_[index++] = IERC721A.transferFrom.selector;
    selectors_[index++] = IERC721A.approve.selector;
    selectors_[index++] = IERC721A.getApproved.selector;
    selectors_[index++] = IERC721A.setApprovalForAll.selector;
    selectors_[index++] = IERC721A.isApprovedForAll.selector;
    selectors_[index++] = IERC721A.name.selector;
    selectors_[index++] = IERC721A.symbol.selector;
    selectors_[index++] = IERC721A.tokenURI.selector;
    selectors_[index++] = bytes4(
      keccak256("safeTransferFrom(address,address,uint256)")
    );
    selectors_[index++] = bytes4(
      keccak256("safeTransferFrom(address,address,uint256,bytes)")
    );

    // TownOwner
    selectors_[index++] = TownOwner.setFactory.selector;
    selectors_[index++] = TownOwner.mintTown.selector;
    selectors_[index++] = TownOwner.getTownInfo.selector;
    selectors_[index++] = TownOwner.nextTokenId.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return TownOwner.__TownOwner__init.selector;
  }
}
