// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IMembership, IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {MembershipReferralHelper} from "contracts/test/towns/membership/MembershipReferralSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {TownArchitectSetup} from "contracts/test/towns/architect/TownArchitectSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";

// contracts
import {MembershipFacet} from "contracts/src/towns/facets/membership/MembershipFacet.sol";
import {MockSimpleEntitlement} from "contracts/test/mocks/MockSimpleEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {EntitlementsManager} from "contracts/src/towns/facets/entitlements/EntitlementsManager.sol";

// mocks
import {MockERC721A} from "contracts/test/mocks/MockERC721A.sol";

abstract contract MembershipSetup is IMembershipBase, FacetTest {
  MembershipFacet internal membership;
  MockSimpleEntitlement internal entitlement;
  EntitlementsManager internal manager;

  address internal townFactory;
  address internal founder;
  address internal founderDAO;

  // entitled user
  address internal alice;

  // non-entitled user
  address internal bob;

  function setUp() public override {
    founder = _randomAddress();
    founderDAO = _randomAddress();
    alice = _randomAddress();
    bob = _randomAddress();

    super.setUp();
    membership = MembershipFacet(address(diamond));
    manager = EntitlementsManager(address(diamond));

    // initializer user entitlement
    MockSimpleEntitlement impl = new MockSimpleEntitlement();
    entitlement = MockSimpleEntitlement(
      address(
        new ERC1967Proxy(
          address(impl),
          abi.encodeCall(MockSimpleEntitlement.initialize, (diamond))
        )
      )
    );

    vm.prank(founder);
    manager.addEntitlementModule(address(entitlement));

    vm.prank(diamond);
    entitlement.setEntitlement(1, abi.encode(alice));
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    TownArchitectSetup townArchitectSetup = new TownArchitectSetup();
    MembershipHelper membershipHelper = new MembershipHelper();
    IntrospectionHelper introspectionHelper = new IntrospectionHelper();
    TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
    ERC721AHelper erc721aHelper = new ERC721AHelper();
    MembershipReferralHelper membershipReferralHelper = new MembershipReferralHelper();
    EntitlementsHelper entitlementsHelper = new EntitlementsHelper();

    MultiInit multiInit = new MultiInit();
    MockERC721A mockERC721A = new MockERC721A();

    // mint nft to founder so onlyOwner works
    uint256 tokenId = mockERC721A.mintTo(founder);

    townArchitectSetup.setUp();
    townFactory = address(townArchitectSetup.townArchitect());

    membershipHelper.addSelectors(erc721aHelper.selectors());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](5);

    cuts[0] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = membershipHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[3] = membershipReferralHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[4] = entitlementsHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](4);
    addresses[0] = introspectionHelper.facet();
    addresses[1] = membershipHelper.facet();
    addresses[2] = tokenOwnableHelper.facet();
    addresses[3] = membershipReferralHelper.facet();

    bytes[] memory payloads = new bytes[](4);
    payloads[0] = introspectionHelper.makeInitData("");
    payloads[1] = abi.encodeWithSelector(
      membershipHelper.initializer(),
      MembershipInfo({
        name: "Membership",
        symbol: "MEM",
        price: 0,
        maxSupply: 0,
        duration: 0,
        currency: address(0),
        feeRecipient: founderDAO,
        freeAllocation: 0,
        pricingModule: address(0)
      }),
      townFactory
    );
    payloads[2] = abi.encodeWithSelector(
      tokenOwnableHelper.initializer(),
      address(mockERC721A),
      tokenId
    );
    payloads[3] = membershipReferralHelper.makeInitData("");

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

contract MembershipHelper is FacetHelper {
  MembershipFacet internal membership;

  constructor() {
    membership = new MembershipFacet();

    uint256 index;
    bytes4[] memory selectors_ = new bytes4[](21);

    // Minting
    selectors_[index++] = IMembership.joinTown.selector;
    selectors_[index++] = IMembership.joinTownWithReferral.selector;
    selectors_[index++] = IMembership.renewMembership.selector;
    selectors_[index++] = IMembership.cancelMembership.selector;
    selectors_[index++] = IMembership.expiresAt.selector;

    // Duration
    selectors_[index++] = IMembership.setMembershipDuration.selector;
    selectors_[index++] = IMembership.getMembershipDuration.selector;

    // Pricing Module
    selectors_[index++] = IMembership.setMembershipPricingModule.selector;
    selectors_[index++] = IMembership.getMembershipPricingModule.selector;

    // Pricing
    selectors_[index++] = IMembership.setMembershipPrice.selector;
    selectors_[index++] = IMembership.getMembershipPrice.selector;
    selectors_[index++] = IMembership.getMembershipRenewalPrice.selector;

    // Allocation
    selectors_[index++] = IMembership.setMembershipFreeAllocation.selector;
    selectors_[index++] = IMembership.getMembershipFreeAllocation.selector;

    // Limits
    selectors_[index++] = IMembership.setMembershipLimit.selector;
    selectors_[index++] = IMembership.getMembershipLimit.selector;

    // Currency
    selectors_[index++] = IMembership.setMembershipCurrency.selector;
    selectors_[index++] = IMembership.getMembershipCurrency.selector;

    // Recipient
    selectors_[index++] = IMembership.setMembershipFeeRecipient.selector;
    selectors_[index++] = IMembership.getMembershipFeeRecipient.selector;

    // Factory
    selectors_[index++] = IMembership.getTownFactory.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(membership);
  }

  function initializer() public view override returns (bytes4) {
    return membership.__Membership_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }
}
