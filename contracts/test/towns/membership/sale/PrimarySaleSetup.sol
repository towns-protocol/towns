// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {PrimarySaleFacet} from "contracts/src/towns/facets/membership/sale/PrimarySaleFacet.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// mocks
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

abstract contract PrimarySaleSetup is FacetTest {
  PrimarySaleFacet internal primarySaleFacet;
  MockERC721 internal token;

  address internal recipient;
  address internal founder;

  function setUp() public override {
    super.setUp();
    primarySaleFacet = PrimarySaleFacet(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    PrimarySaleHelper primarySaleHelper = new PrimarySaleHelper();
    TokenOwnableHelper tokeOwnableHelper = new TokenOwnableHelper();
    MultiInit multiInit = new MultiInit();

    token = new MockERC721();
    founder = _randomAddress();
    recipient = _randomAddress();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);
    cuts[0] = primarySaleHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = tokeOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);

    uint256 tokenId = token.mintTo(founder);

    address[] memory initAddresses = new address[](2);
    initAddresses[0] = primarySaleHelper.facet();
    initAddresses[1] = tokeOwnableHelper.facet();

    bytes[] memory initDatas = new bytes[](2);
    initDatas[0] = primarySaleHelper.makeInitData(abi.encode(recipient));
    initDatas[1] = abi.encodeWithSelector(
      tokeOwnableHelper.initializer(),
      address(token),
      tokenId
    );

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          multiInit.multiInit.selector,
          initAddresses,
          initDatas
        )
      });
  }
}

contract PrimarySaleHelper is FacetHelper {
  PrimarySaleFacet internal primarySaleFacet;

  constructor() {
    primarySaleFacet = new PrimarySaleFacet();
  }

  function facet() public view override returns (address) {
    return address(primarySaleFacet);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](2);
    selectors_[0] = primarySaleFacet.primarySaleRecipient.selector;
    selectors_[1] = primarySaleFacet.setPrimarySaleRecipient.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return PrimarySaleFacet.__PrimarySale_init.selector;
  }

  function makeInitData(
    bytes memory data
  ) public view virtual override returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), abi.decode(data, (address)));
  }
}
