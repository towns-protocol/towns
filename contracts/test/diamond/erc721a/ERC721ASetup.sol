// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// mocks
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {MockERC721A} from "contracts/test/mocks/MockERC721A.sol";

contract ERC721ASetup is FacetTest {
  MockERC721A internal erc721a;

  function setUp() public override {
    super.setUp();
    erc721a = MockERC721A(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    ERC721AHelper erc721aHelper = new ERC721AHelper();
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();

    MultiInit diamondMultiInit = new MultiInit();

    address[] memory addresses = new address[](2);
    bytes[] memory payloads = new bytes[](2);

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = erc721aHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);

    addresses[0] = address(erc721aHelper.facet());
    addresses[1] = address(introspectionHelper.facet());

    payloads[0] = erc721aHelper.makeInitData("");
    payloads[1] = introspectionHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(diamondMultiInit),
        initData: abi.encodeWithSelector(
          diamondMultiInit.multiInit.selector,
          addresses,
          payloads
        )
      });
  }
}

contract ERC721AHelper is FacetHelper {
  MockERC721A internal erc721a;

  constructor() {
    erc721a = new MockERC721A();
  }

  function facet() public view override returns (address) {
    return address(erc721a);
  }

  function initializer() public view override returns (bytes4) {
    return erc721a.init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](16);
    uint256 index;
    // Default ones
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

    // Custom ones
    selectors_[index++] = erc721a.mint.selector;
    selectors_[index++] = erc721a.burn.selector;
    selectors_[index++] = erc721a.mintTo.selector;

    return selectors_;
  }
}
