// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";
import {ITownArchitect, ITownArchitectBase} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";

// contracts
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {ProxyManagerHelper} from "contracts/test/diamond/proxy/ProxyManagerSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {TownArchitectHelper} from "contracts/test/towns/architect/TownArchitectSetup.sol";
import {TownOwnerImplementation} from "contracts/test/towns/owner/TownOwnerSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {UserEntitlement} from "contracts/src/towns/entitlements/user/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/towns/entitlements/token/TokenEntitlement.sol";

import {TownImplementationHelper} from "contracts/test/towns/Town.t.sol";

abstract contract IntegrationSetup is FacetTest {
  address internal townToken;
  address internal userEntitlement;
  address internal tokenEntitlement;
  address internal townImplementation;

  function setUp() public override {
    super.setUp();

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
    TownImplementationHelper townHelper = new TownImplementationHelper();
    TownOwnerImplementation townOwnerImplementation = new TownOwnerImplementation();

    MultiInit multiInit = new MultiInit();

    userEntitlement = address(new UserEntitlement());
    tokenEntitlement = address(new TokenEntitlement());
    townToken = address(
      new Diamond(townOwnerImplementation.diamondInitParams(deployer))
    );

    townImplementation = address(townHelper.createImplementation(deployer));

    // cuts
    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](4);
    uint256 index;

    cuts[index++] = townArchitectHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = proxyManagerHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = ownableHelper.makeCut(IDiamond.FacetCutAction.Add);
    cuts[index++] = pausableHelper.makeCut(IDiamond.FacetCutAction.Add);

    address[] memory initAddresses = new address[](4);
    bytes[] memory initDatas = new bytes[](4);

    initAddresses[0] = townArchitectHelper.facet();
    initAddresses[1] = proxyManagerHelper.facet();
    initAddresses[2] = ownableHelper.facet();
    initAddresses[3] = pausableHelper.facet();

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

  function _createSimpleTown(string memory townId) internal returns (address) {
    ITownArchitectBase.TownInfo memory townInfo = ITownArchitectBase.TownInfo({
      id: townId,
      name: "test",
      uri: "ipfs://test",
      everyoneEntitlement: ITownArchitectBase.RoleInfo({
        name: "Everyone",
        permissions: new string[](0)
      }),
      memberEntitlement: ITownArchitectBase.MemberEntitlement({
        role: ITownArchitectBase.RoleInfo({
          name: "test",
          permissions: new string[](0)
        }),
        tokens: new ITokenEntitlement.ExternalToken[](0),
        users: new address[](0)
      }),
      channel: ITownArchitectBase.ChannelInfo({
        id: "test",
        metadata: "ipfs://test"
      })
    });

    return TownArchitect(diamond).createTown(townInfo);
  }
}
