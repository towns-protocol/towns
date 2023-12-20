// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ITownArchitect, ITownArchitectBase} from "./ITownArchitect.sol";
import {IEntitlement} from "contracts/src/towns/entitlements/IEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/towns/facets/entitlements/IEntitlementsManager.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";
import {ITownProxyBase} from "contracts/src/towns/facets/proxy/ITownProxy.sol";
import {IManagedProxyBase} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";
import {IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {TownArchitectStorage} from "./TownArchitectStorage.sol";
import {Permissions} from "contracts/src/towns/facets/Permissions.sol";

// contracts
import {Factory} from "contracts/src/utils/Factory.sol";
import {TownProxy} from "contracts/src/towns/facets/proxy/TownProxy.sol";

// modules
import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract TownArchitectBase is Factory, ITownArchitectBase {
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.AddressSet;

  address internal constant EVERYONE_ADDRESS = address(1);
  string internal constant MINTER_ROLE = "Minter";

  // =============================================================
  //                           Towns
  // =============================================================

  function _getTownById(string memory townId) internal view returns (address) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.townById[townId];
  }

  function _getTokenIdByTownId(
    string memory townId
  ) internal view returns (uint256) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.tokenIdByTownId[townId];
  }

  function _getTokenIdByTown(address town) internal view returns (uint256) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.tokenIdByTown[town];
  }

  function _createTown(
    TownInfo memory townInfo
  ) internal returns (address townAddress) {
    // validate id length
    Validator.checkStringLength(townInfo.id);

    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    // validate the network id isn't already taken
    if (ds.townIds.contains(townInfo.id))
      revert TownArchitect__InvalidNetworkId();

    // get the token id of the next town
    uint256 tokenId = TownOwner(ds.townToken).nextTokenId();

    // deploy town
    townAddress = _deployTown(townInfo.id, tokenId, townInfo.membership);

    // save town info to storage
    ds.townIds.add(townInfo.id);
    ds.towns.add(townAddress);

    // save to mappings
    ds.tokenIdByTownId[townInfo.id] = tokenId;
    ds.townById[townInfo.id] = townAddress;
    ds.tokenIdByTown[townAddress] = tokenId;

    // mint token to and transfer to TownArchitect
    TownOwner(ds.townToken).mintTown(
      townInfo.name,
      townInfo.uri,
      townInfo.id,
      townAddress
    );

    // deploy user entitlement
    address userEntitlement = _deployEntitlement(
      TownArchitectStorage.layout().userEntitlement,
      townAddress
    );

    // deploy token entitlement
    address tokenEntitlement = _deployEntitlement(
      TownArchitectStorage.layout().tokenEntitlement,
      townAddress
    );

    address[] memory entitlements = new address[](2);
    entitlements[0] = userEntitlement;
    entitlements[1] = tokenEntitlement;

    // set entitlements as immutable
    IEntitlementsManager(townAddress).addImmutableEntitlements(entitlements);

    // create minter role with requirements
    _createMinterEntitlement(
      townAddress,
      userEntitlement,
      tokenEntitlement,
      townInfo.membership.requirements
    );

    // create member role with membership as the requirement
    uint256 memberRoleId = _createMemberEntitlement(
      townAddress,
      tokenEntitlement,
      townInfo.membership.settings.name,
      townInfo.membership.permissions
    );

    // create channels
    _createChannel(townAddress, memberRoleId, townInfo.channel);

    // transfer nft to sender
    TownOwner(ds.townToken).safeTransferFrom(
      address(this),
      _msgSenderTownArchitect(),
      tokenId
    );

    // emit event
    emit TownCreated(_msgSenderTownArchitect(), tokenId, townAddress);
  }

  // =============================================================
  //                           Implementations
  // =============================================================

  function _setImplementations(
    address townToken,
    address userEntitlement,
    address tokenEntitlement
  ) internal {
    if (!Address.isContract(townToken)) revert TownArchitect__NotContract();
    if (!Address.isContract(userEntitlement))
      revert TownArchitect__NotContract();
    if (!Address.isContract(tokenEntitlement))
      revert TownArchitect__NotContract();

    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    ds.townToken = townToken;
    ds.userEntitlement = userEntitlement;
    ds.tokenEntitlement = tokenEntitlement;
  }

  function _getImplementations()
    internal
    view
    returns (
      address townToken,
      address userEntitlementImplementation,
      address tokenEntitlementImplementation
    )
  {
    return (
      TownArchitectStorage.layout().townToken,
      TownArchitectStorage.layout().userEntitlement,
      TownArchitectStorage.layout().tokenEntitlement
    );
  }

  // =============================================================
  //                  Internal Channel Helpers
  // =============================================================

  function _createChannel(
    address town,
    uint256 roleId,
    ChannelInfo memory channelInfo
  ) internal {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;
    IChannel(town).createChannel(channelInfo.id, channelInfo.metadata, roleIds);
  }

  // =============================================================
  //                  Internal Entitlement Helpers
  // =============================================================

  function _createMinterEntitlement(
    address townAddress,
    address userEntitlement,
    address tokenEntitlement,
    MembershipRequirements memory requirements
  ) internal returns (uint256 roleId) {
    string[] memory joinPermissions = new string[](1);
    joinPermissions[0] = Permissions.JoinTown;

    roleId = IRoles(townAddress).createRole(
      MINTER_ROLE,
      joinPermissions,
      new IRolesBase.CreateEntitlement[](0)
    );

    if (requirements.everyone) {
      address[] memory users = new address[](1);
      users[0] = EVERYONE_ADDRESS;

      IRoles(townAddress).addRoleToEntitlement(
        roleId,
        IRolesBase.CreateEntitlement({
          module: userEntitlement,
          data: abi.encode(users)
        })
      );

      return roleId;
    }

    if (requirements.users.length != 0) {
      // validate users
      for (uint256 i = 0; i < requirements.users.length; ) {
        Validator.checkAddress(requirements.users[i]);
        unchecked {
          i++;
        }
      }

      IRoles(townAddress).addRoleToEntitlement(
        roleId,
        IRolesBase.CreateEntitlement({
          module: userEntitlement,
          data: abi.encode(requirements.users)
        })
      );
    }

    if (requirements.tokens.length == 0) return roleId;

    IRoles(townAddress).addRoleToEntitlement(
      roleId,
      IRolesBase.CreateEntitlement({
        module: tokenEntitlement,
        data: abi.encode(requirements.tokens)
      })
    );
  }

  function _createMemberEntitlement(
    address townAddress,
    address tokenEntitlement,
    string memory memberName,
    string[] memory memberPermissions
  ) internal returns (uint256 roleId) {
    // create external token requirement for the member nft
    ITokenEntitlement.ExternalToken[]
      memory tokens = new ITokenEntitlement.ExternalToken[](1);

    tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: townAddress,
      quantity: 1,
      isSingleToken: false,
      tokenIds: new uint256[](0)
    });

    IRolesBase.CreateEntitlement[]
      memory entitlements = new IRolesBase.CreateEntitlement[](1);
    entitlements[0].module = tokenEntitlement;
    entitlements[0].data = abi.encode(tokens);

    roleId = IRoles(townAddress).createRole(
      memberName,
      memberPermissions,
      entitlements
    );
  }

  // =============================================================
  //                      Deployment Helpers
  // =============================================================

  function _getTownDeploymentAddress(
    string memory townId,
    uint256 tokenId,
    Membership memory membership
  ) internal view returns (address town) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    // get deployment info
    (bytes memory initCode, bytes32 salt) = _getTownDeploymentInfo(
      townId,
      ds.townToken,
      tokenId,
      membership
    );
    return _calculateDeploymentAddress(keccak256(initCode), salt);
  }

  function _deployTown(
    string memory townId,
    uint256 tokenId,
    Membership memory membership
  ) internal returns (address town) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    // get deployment info
    (bytes memory initCode, bytes32 salt) = _getTownDeploymentInfo(
      townId,
      ds.townToken,
      tokenId,
      membership
    );
    return _deploy(initCode, salt);
  }

  function _deployEntitlement(
    address entitlement,
    address townAddress
  ) internal returns (address) {
    // calculate init code
    bytes memory initCode = abi.encodePacked(
      type(ERC1967Proxy).creationCode,
      abi.encode(
        entitlement,
        abi.encodeCall(IEntitlement.initialize, (townAddress))
      )
    );

    return _deploy(initCode);
  }

  function _getTownDeploymentInfo(
    string memory townId,
    address townOwnerCollection,
    uint256 tokenId,
    Membership memory membership
  ) internal view returns (bytes memory initCode, bytes32 salt) {
    // calculate salt
    salt = keccak256(abi.encode(townId, townOwnerCollection, tokenId));

    // calculate init code
    initCode = abi.encodePacked(
      type(TownProxy).creationCode,
      abi.encode(
        ITownProxyBase.TownProxyInit({
          managedProxy: IManagedProxyBase.ManagedProxyInit({
            managerSelector: IProxyManager.getImplementation.selector,
            manager: address(this)
          }),
          tokenOwnable: ITownProxyBase.TokenOwnable({
            townOwner: townOwnerCollection,
            tokenId: tokenId
          }),
          membership: IMembershipBase.MembershipInfo({
            name: membership.settings.name,
            symbol: membership.settings.symbol,
            price: membership.settings.price,
            maxSupply: membership.settings.maxSupply,
            duration: membership.settings.duration,
            currency: membership.settings.currency,
            feeRecipient: membership.settings.feeRecipient == address(0)
              ? _msgSenderTownArchitect()
              : membership.settings.feeRecipient,
            freeAllocation: membership.settings.freeAllocation,
            pricingModule: membership.settings.pricingModule
          })
        })
      )
    );
  }

  function _getNextTokenId() internal view returns (uint256 tokenId) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    tokenId = TownOwner(ds.townToken).nextTokenId();
  }

  // =============================================================
  //                           Validation
  // =============================================================

  function _isValidTown(address townAddress) internal view returns (bool) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.towns.contains(townAddress);
  }

  // =============================================================
  //                           Overrides
  // =============================================================

  function _msgSenderTownArchitect() internal view virtual returns (address) {
    return msg.sender;
  }
}
