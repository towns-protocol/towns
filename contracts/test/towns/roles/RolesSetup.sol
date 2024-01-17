// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {IRoles} from "contracts/src/towns/facets/roles/IRoles.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";

// helpers
import {TokenOwnableHelper} from "contracts/test/diamond/ownable/token/TokenOwnableSetup.sol";
import {EntitlementsHelper} from "contracts/test/towns/entitlements/EntitlementsSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/channels/ChannelsHelper.sol";

// mocks
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

contract RolesSetup is FacetTest {
  Roles internal roles;
  MockERC721 internal token;
  MockUserEntitlement internal mockEntitlement;

  address internal founder;

  function setUp() public override {
    super.setUp();
    roles = Roles(diamond);
    mockEntitlement.initialize(diamond);
  }

  function diamondInitParams()
    public
    override
    returns (Diamond.InitParams memory)
  {
    TokenOwnableHelper tokenOwnableHelper = new TokenOwnableHelper();
    EntitlementsHelper entitlementsHelper = new EntitlementsHelper();
    RolesHelper rolesHelper = new RolesHelper();
    ChannelsHelper channelsHelper = new ChannelsHelper();

    token = new MockERC721();
    mockEntitlement = new MockUserEntitlement();

    uint256 cutCount = 4;

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](cutCount);
    cuts[0] = tokenOwnableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[1] = entitlementsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[2] = channelsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[3] = rolesHelper.makeCut(IDiamond.FacetCutAction.Add);

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

contract RolesHelper is FacetHelper {
  Roles internal roles;

  constructor() {
    roles = new Roles();
  }

  function deploy() public returns (address) {
    roles = new Roles();
    return address(roles);
  }

  function facet() public view override returns (address) {
    return address(roles);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](10);
    selectors_[0] = IRoles.createRole.selector;
    selectors_[1] = IRoles.getRoles.selector;
    selectors_[2] = IRoles.getRoleById.selector;
    selectors_[3] = IRoles.updateRole.selector;
    selectors_[4] = IRoles.removeRole.selector;
    selectors_[5] = IRoles.addPermissionsToRole.selector;
    selectors_[6] = IRoles.removePermissionsFromRole.selector;
    selectors_[7] = IRoles.getPermissionsByRoleId.selector;
    selectors_[8] = IRoles.addRoleToEntitlement.selector;
    selectors_[9] = IRoles.removeRoleFromEntitlement.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
