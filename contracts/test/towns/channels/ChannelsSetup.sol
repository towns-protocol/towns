// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {Channels} from "contracts/src/towns/facets/channels/Channels.sol";

// helpers
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";
import {RolesHelper} from "contracts/test/towns/roles/RolesSetup.sol";

import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

abstract contract ChannelsSetup is FacetTest {
  Channels internal channels;
  MockERC721 internal token;
  address internal founder;

  function setUp() public override {
    super.setUp();
    channels = Channels(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
    ChannelsHelper channelsHelper = new ChannelsHelper();
    EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
    RolesHelper rolesHelper = new RolesHelper();

    token = new MockERC721();
    founder = _randomAddress();

    uint256 cutCount = 4;

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](cutCount);
    cuts[0] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = channelsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = entitlementsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[3] = rolesHelper.makeCut(IDiamond.FacetCutAction.Add);

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

contract ChannelsHelper is FacetHelper {
  Channels internal channels;

  constructor() {
    channels = new Channels();
  }

  function deploy() public returns (address) {
    channels = new Channels();
    return address(channels);
  }

  function facet() public view override returns (address) {
    return address(channels);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](7);
    selectors_[0] = IChannel.createChannel.selector;
    selectors_[1] = IChannel.getChannel.selector;
    selectors_[2] = IChannel.getChannels.selector;
    selectors_[3] = IChannel.updateChannel.selector;
    selectors_[4] = IChannel.removeChannel.selector;
    selectors_[5] = IChannel.addRoleToChannel.selector;
    selectors_[6] = IChannel.removeRoleFromChannel.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
