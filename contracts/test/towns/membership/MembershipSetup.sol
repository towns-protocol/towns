// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IMembership, IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";
import {IERC2771Recipient} from "contracts/src/diamond/facets/recipient/IERC2771Recipient.sol";

// libraries

// helpers
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {TownArchitectSetup} from "contracts/test/towns/architect/TownArchitectSetup.sol";

// contracts
import {MembershipFacet} from "contracts/src/towns/facets/membership/MembershipFacet.sol";
import {MinimalForwarder} from "openzeppelin-contracts/contracts/metatx/MinimalForwarder.sol";

// mocks
import {MockERC721A} from "contracts/test/mocks/MockERC721A.sol";

abstract contract MembershipSetup is IMembershipBase, FacetTest {
  MembershipFacet internal membership;
  address townFactory;
  address founder;
  address townDAO;

  function setUp() public override {
    super.setUp();
    membership = MembershipFacet(address(diamond));
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

    MultiInit multiInit = new MultiInit();
    MinimalForwarder trustedForwarder = new MinimalForwarder();
    MockERC721A mockERC721A = new MockERC721A();

    founder = _randomAddress();
    townDAO = _randomAddress();
    uint256 tokenId = mockERC721A.mintTo(founder);

    townArchitectSetup.setUp();
    townFactory = address(townArchitectSetup.townArchitect());

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);

    cuts[0] = introspectionHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = membershipHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory addresses = new address[](3);
    addresses[0] = introspectionHelper.facet();
    addresses[1] = membershipHelper.facet();
    addresses[2] = tokenOwnableHelper.facet();

    bytes[] memory payloads = new bytes[](3);
    payloads[0] = introspectionHelper.makeInitData("");
    payloads[1] = abi.encodeWithSelector(
      membershipHelper.initializer(),
      MembershipInfo({
        membershipPrice: 0,
        membershipLimit: 0,
        membershipCurrency: address(0),
        membershipFeeRecipient: townDAO,
        townFactory: townFactory,
        forwarder: address(trustedForwarder),
        name: "Membership",
        symbol: "MEM"
      })
    );
    payloads[2] = abi.encodeWithSelector(
      tokenOwnableHelper.initializer(),
      address(mockERC721A),
      tokenId
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

contract MembershipHelper is FacetHelper {
  MembershipFacet internal membership;

  constructor() {
    membership = new MembershipFacet();
  }

  function facet() public view override returns (address) {
    return address(membership);
  }

  function initializer() public view override returns (bytes4) {
    return membership.__Membership_init.selector;
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](27);
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

    // Forwarder
    selectors_[index++] = IERC2771Recipient.isTrustedForwarder.selector;

    // Minting
    selectors_[index++] = IMembership.joinTown.selector;
    selectors_[index++] = IMembership.renewMembership.selector;
    selectors_[index++] = IMembership.cancelMembership.selector;
    selectors_[index++] = IMembership.expiresAt.selector;

    // Pricing
    selectors_[index++] = IMembership.setMembershipPrice.selector;
    selectors_[index++] = IMembership.getMembershipPrice.selector;

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

    return selectors_;
  }
}
