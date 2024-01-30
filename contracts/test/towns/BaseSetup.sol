// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";

// deployments
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {UserEntitlement} from "contracts/src/towns/entitlements/user/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/towns/entitlements/token/TokenEntitlement.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

// helpers
import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";
import {ProxyManagerHelper} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {PlatformRequirementsHelper} from "contracts/test/towns/platform/requirements/PlatformRequirementsHelper.sol";
import {PrepayHelper} from "contracts/test/towns/prepay/PrepayHelper.sol";
import {TownHelper} from "contracts/test/towns/TownHelper.sol";

// deployments
import {DeployUserEntitlement} from "contracts/scripts/deployments/DeployUserEntitlement.s.sol";
import {DeployTokenEntitlement} from "contracts/scripts/deployments/DeployTokenEntitlement.s.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {DeployTown} from "contracts/scripts/deployments/DeployTown.s.sol";
import {DeployTownOwner} from "contracts/scripts/deployments/DeployTownOwner.s.sol";

/*
 * @notice - This is the base setup to start testing the entire suite of contracts
 * @dev - This contract is inherited by all other test contracts, it will create one diamond contract which represent the factory contract that creates all spaces
 */
contract BaseSetup is FacetTest, TownHelper {
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployTown deployTown = new DeployTown();
  DeployTownOwner deployTownOwner = new DeployTownOwner();
  DeployUserEntitlement deployUserEntitlement = new DeployUserEntitlement();
  DeployTokenEntitlement deployTokenEntitlement = new DeployTokenEntitlement();

  // @dev look at deploy-towns-contracts.sh for the order of deployment
  address internal multiInit;
  address internal townOwner;
  address internal userEntitlement;
  address internal tokenEntitlement;
  address internal townDiamond;
  address public townFactory;

  address internal founder;
  address internal space;
  address internal everyoneSpace;

  // @notice - This function is called before each test function
  // @dev - It will create a new diamond contract and set the townFactory variable to the address of the diamond
  function setUp() public virtual override {
    // run diamondInitParams
    super.setUp();

    // run after diamondInitParams
    townFactory = diamond;

    vm.prank(deployer);
    TownOwner(townOwner).setFactory(townFactory);

    // create a new space
    founder = _randomAddress();

    vm.startPrank(founder);
    space = TownArchitect(townFactory).createTown(
      _createTownInfo("BaseSetupTown")
    );
    everyoneSpace = TownArchitect(townFactory).createTown(
      _createEveryoneTownInfo("BaseSetupEveryoneTown")
    );
    vm.stopPrank();
  }

  function diamondInitParams()
    public
    virtual
    override
    returns (Diamond.InitParams memory)
  {
    /// @dev Creates towns
    TownArchitectHelper townArchitectHelper = new TownArchitectHelper();

    /// @dev Manages proxy requests to towns
    ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();

    /// @dev Ownership of contract
    OwnableHelper ownableHelper = new OwnableHelper();

    /// @dev Pauses contract
    PausableHelper pausableHelper = new PausableHelper();

    /// @dev Platform requirements
    PlatformRequirementsHelper platformReqsHelper = new PlatformRequirementsHelper();

    /// @dev Prepay memberships
    PrepayHelper prepayHelper = new PrepayHelper();

    vm.stopPrank();

    // deploy multi init
    multiInit = address(deployMultiInit.deploy());

    /// @dev Deploy user entitlement
    userEntitlement = deployUserEntitlement.deploy();

    /// @dev Deploy token entitlement
    tokenEntitlement = deployTokenEntitlement.deploy();

    /// @dev Deploy town owner nft
    townOwner = deployTownOwner.deploy();

    /// @dev Deploy town diamond
    townDiamond = deployTown.deploy();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](6);
    address[] memory addresses = new address[](6);
    bytes[] memory payloads = new bytes[](6);

    uint256 index;

    cuts[index++] = townArchitectHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = proxyManagerHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = pausableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = platformReqsHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = prepayHelper.makeCut(IDiamond.FacetCutAction.Add);

    index = 0;

    addresses[index++] = townArchitectHelper.facet();
    addresses[index++] = proxyManagerHelper.facet();
    addresses[index++] = ownableHelper.facet();
    addresses[index++] = pausableHelper.facet();
    addresses[index++] = platformReqsHelper.facet();
    addresses[index++] = prepayHelper.facet();

    index = 0;

    payloads[index++] = townArchitectHelper.makeInitData(
      townOwner,
      userEntitlement,
      tokenEntitlement
    );
    payloads[index++] = proxyManagerHelper.makeInitData(townDiamond);
    payloads[index++] = ownableHelper.makeInitData(deployer);
    payloads[index++] = pausableHelper.makeInitData("");
    payloads[index++] = platformReqsHelper.makeInitData({
      feeRecipient: deployer,
      membershipBps: 500, // 5%
      membershipFee: 1 ether,
      membershipMintLimit: 1_000,
      membershipDuration: 365 days
    });
    payloads[index++] = prepayHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: address(multiInit),
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          addresses,
          payloads
        )
      });
  }
}
