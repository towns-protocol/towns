// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IDiamondCut} from "contracts/src/diamond/extensions/cut/IDiamondCut.sol";
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITownArchitectStructs} from "contracts/src/towns/facets/architect/ITownArchitect.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";

//libraries
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

//contracts
import {Town} from "contracts/src/towns/Town.sol";
import {TownFactory} from "contracts/src/towns/TownFactory.sol";
import {TownOwner} from "contracts/src/tokens/TownOwner.sol";
import {UserEntitlement} from "contracts/src/towns/entitlements/user/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/towns/entitlements/token/TokenEntitlement.sol";
import {TownFactoryInit} from "contracts/src/towns/initializers/TownFactoryInit.sol";

import {EntitlementsHelper} from "contracts/test/towns/facets/entitlements/EntitlementsSetup.sol";
import {ChannelsHelper} from "contracts/test/towns/facets/channels/ChannelsSetup.sol";
import {RolesHelper} from "contracts/test/towns/facets/roles/RolesSetup.sol";

import {ProxyManagerHelper} from "contracts/test/towns/facets/manager/ProxyManagerSetup.sol";
import {PausableHelper} from "contracts/test/diamond/pausable/PausableSetup.sol";
import {ERC721HolderHelper} from "contracts/test/towns/facets/holder/ERC721HolderSetup.sol";
import {TownArchitectHelper} from "contracts/test/towns/facets/architect/TownArchitectSetup.sol";

abstract contract TownFactoryTest is TestUtils {
  address internal deployer;

  address internal town;
  address internal townFactory;
  address internal townToken;
  address internal userEntitlement;
  address internal tokenEntitlement;

  address internal townFactoryInit;

  function setUp() public virtual {
    deployer = _randomAddress();

    vm.startPrank(deployer);

    // ==================== Town ====================

    EntitlementsHelper entitlements = new EntitlementsHelper();
    ChannelsHelper channels = new ChannelsHelper();
    RolesHelper roles = new RolesHelper();

    IDiamond.FacetCut[] memory townCuts = new IDiamond.FacetCut[](3);
    uint256 townCutIndex;
    townCuts[townCutIndex++] = entitlements.makeCut(
      IDiamond.FacetCutAction.Add
    );
    townCuts[townCutIndex++] = channels.makeCut(IDiamond.FacetCutAction.Add);
    townCuts[townCutIndex++] = roles.makeCut(IDiamond.FacetCutAction.Add);

    town = address(new Town());
    IDiamondCut(town).diamondCut(townCuts, address(0), "");

    // ==================== Town Factory ====================

    TownArchitectHelper townArchitectHelper = new TownArchitectHelper();
    ProxyManagerHelper proxyManagerHelper = new ProxyManagerHelper();
    PausableHelper pausableHelper = new PausableHelper();
    ERC721HolderHelper holderHelper = new ERC721HolderHelper();

    IDiamond.FacetCut[] memory factoryCuts = new IDiamond.FacetCut[](4);
    uint256 factoryCutIndex;
    factoryCuts[factoryCutIndex++] = townArchitectHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );
    factoryCuts[factoryCutIndex++] = proxyManagerHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );
    factoryCuts[factoryCutIndex++] = pausableHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );
    factoryCuts[factoryCutIndex++] = holderHelper.makeCut(
      IDiamond.FacetCutAction.Add
    );

    townFactory = address(new TownFactory());

    // ==================== Town Token ====================

    townToken = address(new TownOwner("Town Founder", "TOWN", deployer, 0));
    TownOwner(townToken).setFactory(address(townFactory));

    // ==================== Entitlements ====================

    tokenEntitlement = address(new TokenEntitlement());
    userEntitlement = address(new UserEntitlement());

    // ==================== Town Factory Init ====================

    townFactoryInit = address(new TownFactoryInit());

    // ==================== Init Town Factory ====================
    (address initAddress, bytes memory initPayload) = _makeFactoryInitData();
    IDiamondCut(townFactory).diamondCut(factoryCuts, initAddress, initPayload);

    vm.stopPrank();
  }

  function _makeFactoryInitData()
    internal
    view
    returns (address, bytes memory data)
  {
    TownFactoryInit.Args memory args = TownFactoryInit.Args({
      proxyImplementation: town,
      townToken: townToken,
      userEntitlementImplementation: userEntitlement,
      tokenEntitlementImplementation: tokenEntitlement
    });

    return (
      address(townFactoryInit),
      abi.encodeWithSelector(TownFactoryInit.init.selector, args)
    );
  }

  function _createSimpleTown(string memory townId) internal returns (address) {
    ITownArchitectStructs.TownInfo memory townInfo = ITownArchitectStructs
      .TownInfo({
        id: townId,
        metadata: "test",
        everyoneEntitlement: ITownArchitectStructs.RoleInfo({
          name: "Everyone",
          permissions: new string[](0)
        }),
        memberEntitlement: ITownArchitectStructs.MemberEntitlement({
          role: ITownArchitectStructs.RoleInfo({
            name: "test",
            permissions: new string[](0)
          }),
          tokens: new ITokenEntitlement.ExternalToken[](0),
          users: new address[](0)
        }),
        channel: ITownArchitectStructs.ChannelInfo({
          id: "test",
          metadata: "ipfs://test"
        })
      });

    return ITownArchitect(townFactory).createTown(townInfo);
  }
}
