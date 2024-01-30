// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {AccessControlListFacet, IAccessControlList} from "contracts/src/node-network/acl/AccessControlListFacet.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// helpers
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";

abstract contract AccessControlListSetup is FacetTest {
  AccessControlListFacet internal accessControlList;

  function setUp() public override {
    super.setUp();

    vm.prank(deployer);
    accessControlList = AccessControlListFacet(diamond);
    vm.stopPrank();
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    OwnableHelper ownableHelper = new OwnableHelper();
    AccessControlListHelper accessControlListHelper = new AccessControlListHelper();

    MultiInit multiInit = new MultiInit();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](2);

    // cuts
    cuts[0] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = accessControlListHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](1);
    bytes[] memory initDatas = new bytes[](1);

    initAddresses[0] = ownableHelper.facet();

    initDatas[0] = ownableHelper.makeInitData(deployer);

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

contract AccessControlListHelper is FacetHelper {
  AccessControlListFacet internal accessControlList;

  constructor() {
    accessControlList = new AccessControlListFacet();
  }

  function facet() public view override returns (address) {
    return address(accessControlList);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = IAccessControlList.addToAllowlist.selector;
    selectors_[1] = IAccessControlList.removeFromAllowlist.selector;
    selectors_[2] = IAccessControlList.addToBlocklist.selector;
    selectors_[3] = IAccessControlList.accessControlStatus.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
