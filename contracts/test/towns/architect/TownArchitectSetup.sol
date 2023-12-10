// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {ProxyManagerHelper} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {PlatformRequirementsHelper} from "contracts/test/towns/platform/requirements/PlatformRequirementsSetup.sol";
import {TownOwnerImplementation} from "contracts/test/towns/owner/TownOwnerSetup.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {UserEntitlement} from "contracts/src/towns/entitlements/user/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/towns/entitlements/token/TokenEntitlement.sol";

import {TownImplementationHelper} from "contracts/test/towns/Town.t.sol";

contract TownArchitectSetup is FacetTest {
  address internal townToken;
  address internal userEntitlement;
  address internal tokenEntitlement;
  address internal townImplementation;

  TownArchitect public townArchitect;

  function setUp() public override {
    super.setUp();
    townArchitect = TownArchitect(diamond);

    vm.prank(deployer);
    TownOwner(townToken).setFactory(diamond);
  }

  function diamondInitParams()
    public
    virtual
    override
    returns (Diamond.InitParams memory)
  {
    TownArchitectHelper townArchitectHelper = new TownArchitectHelper();
    ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
    OwnableHelper ownableHelper = new OwnableHelper();
    PausableHelper pausableHelper = new PausableHelper();
    PlatformRequirementsHelper platformReqsHelper = new PlatformRequirementsHelper();
    TownOwnerImplementation townOwnerImplementation = new TownOwnerImplementation();

    TownImplementationHelper townHelper = new TownImplementationHelper();

    MultiInit multiInit = new MultiInit();

    userEntitlement = address(new UserEntitlement());
    tokenEntitlement = address(new TokenEntitlement());
    townToken = address(
      new Diamond(townOwnerImplementation.diamondInitParams(deployer))
    );

    townImplementation = address(townHelper.createImplementation(deployer));

    // cuts
    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](5);

    uint256 index;

    cuts[index++] = townArchitectHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = proxyManagerHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = pausableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = platformReqsHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](5);
    bytes[] memory initDatas = new bytes[](5);

    initAddresses[0] = townArchitectHelper.facet();
    initAddresses[1] = proxyManagerHelper.facet();
    initAddresses[2] = ownableHelper.facet();
    initAddresses[3] = pausableHelper.facet();
    initAddresses[4] = platformReqsHelper.facet();

    initDatas[0] = abi.encodeWithSelector(
      townArchitectHelper.initializer(),
      townToken, // townToken
      userEntitlement, // userEntitlement
      tokenEntitlement // tokenEntitlement
    );
    initDatas[1] = proxyManagerHelper.makeInitData(
      abi.encode(townImplementation)
    );
    initDatas[2] = ownableHelper.makeInitData(abi.encode(deployer));
    initDatas[3] = pausableHelper.makeInitData("");
    initDatas[4] = abi.encodeWithSelector(
      platformReqsHelper.initializer(),
      deployer, // feeRecipient
      500, // membershipBps 5%
      1 ether, // membershipFee
      1_000, // membershipMintLimit
      365 days // membershipDuration
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

contract TownArchitectHelper is FacetHelper {
  TownArchitect internal townArchitect;

  constructor() {
    townArchitect = new TownArchitect();
  }

  function facet() public view override returns (address) {
    return address(townArchitect);
  }

  function initializer() public pure override returns (bytes4) {
    return TownArchitect.__TownArchitect_init.selector;
  }

  function selectors()
    public
    pure
    override
    returns (bytes4[] memory selectors_)
  {
    selectors_ = new bytes4[](11);

    uint256 index;
    selectors_[index++] = ITownArchitect.createTown.selector;
    selectors_[index++] = ITownArchitect.computeTown.selector;
    selectors_[index++] = ITownArchitect
      .getTownArchitectImplementations
      .selector;
    selectors_[index++] = ITownArchitect
      .setTownArchitectImplementations
      .selector;
    selectors_[index++] = ITownArchitect.getTownById.selector;
    selectors_[index++] = ITownArchitect.getTokenIdByTownId.selector;
    selectors_[index++] = ITownArchitect.gateByToken.selector;
    selectors_[index++] = ITownArchitect.ungateByToken.selector;
    selectors_[index++] = ITownArchitect.isTokenGated.selector;
    selectors_[index++] = ITownArchitect.getTokenIdByTown.selector;
    selectors_[index++] = ITownArchitect.isTown.selector;
  }
}
