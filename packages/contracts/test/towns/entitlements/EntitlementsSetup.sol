// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {Entitlements} from "contracts/src/towns/facets/entitlements/Entitlements.sol";

// helpers
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsSetup.sol";
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";

// mocks
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

abstract contract EntitlementsSetup is FacetTest {
  Entitlements internal entitlements;
  MockERC721 internal token;
  MockUserEntitlement internal mockImmutableEntitlement;
  MockUserEntitlement internal mockEntitlement;

  address internal founder;
  address[] internal immutableEntitlements;

  function setUp() public override {
    super.setUp();
    entitlements = Entitlements(diamond);
    mockImmutableEntitlement = new MockUserEntitlement();
    mockEntitlement = new MockUserEntitlement();
    immutableEntitlements.push(address(mockImmutableEntitlement));
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
    ChannelsHelper channelsHelper = new ChannelsHelper();
    RolesHelper rolesHelper = new RolesHelper();
    EntitlementsHelper entitlementsHelper = new EntitlementsHelper();

    token = new MockERC721();

    uint256 cutCount = 4;

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](cutCount);
    cuts[0] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = channelsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = rolesHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[3] = entitlementsHelper.makeCut(IDiamond.FacetCutAction.Add);

    founder = _randomAddress();
    uint256 tokenId = token.mintTo(founder);

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: tokenOwnableHelper.facet(),
        initData: abi.encodeWithSelector(
          tokenOwnableHelper.initializer(),
          address(token),
          tokenId
        )
      });
  }
}

contract EntitlementsHelper is FacetHelper {
  Entitlements internal entitlements;

  constructor() {
    entitlements = new Entitlements();
  }

  function deploy() public returns (address) {
    entitlements = new Entitlements();
    return address(entitlements);
  }

  function facet() public view override returns (address) {
    return address(entitlements);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](7);
    selectors_[0] = IEntitlements.addImmutableEntitlements.selector;
    selectors_[1] = IEntitlements.isEntitledToTown.selector;
    selectors_[2] = IEntitlements.isEntitledToChannel.selector;
    selectors_[3] = IEntitlements.addEntitlement.selector;
    selectors_[4] = IEntitlements.removeEntitlement.selector;
    selectors_[5] = IEntitlements.getEntitlement.selector;
    selectors_[6] = IEntitlements.getEntitlements.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
