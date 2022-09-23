//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {DataTypes} from "../../libraries/DataTypes.sol";
import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";
import {IERC20} from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract PurchasableEntitlementModule is EntitlementModuleBase {
  mapping(uint256 => SpacePurchasableEntitlements) purchasableEntitlementsBySpaceId;

  struct SpacePurchasableEntitlements {
    mapping(string => PurchasableEntitlement) entitlementsByTag;
  }

  struct PurchasableEntitlement {
    string description;
    uint256 price;
    uint256 roleId;
    bool isActive;
    //length of time?
  }

  ///@notice Used for storing the actual purchases by Space
  mapping(uint256 => PurchasedSpaceEntitlements) purchasedEntitlementsBySpaceId;

  ///@notice Maps the actual user that made the purchase
  struct PurchasedSpaceEntitlements {
    mapping(address => string[]) userPurchasedEntitlements;
  }

  mapping(uint256 => uint256) valueBySpaceId;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) EntitlementModuleBase(name_, description_, spaceManager_) {}

  function setEntitlement(
    uint256 spaceId,
    uint256,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    address ownerAddress = ISpaceManager(_spaceManager).getSpaceOwnerBySpaceId(
      spaceId
    );

    (string memory _description, uint256 value, string memory tag) = abi.decode(
      entitlementData,
      (string, uint256, string)
    );

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    if (value == 0) {
      revert("No value provided");
    }

    if (
      purchasableEntitlementsBySpaceId[spaceId].entitlementsByTag[tag].price !=
      0
    ) {
      revert("Entitlement tag already exists");
    }

    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        spaceId
      ];
    spacePurchasableEntitlements.entitlementsByTag[
      tag
    ] = PurchasableEntitlement(_description, value, roleId, true);
  }

  function disablePurchasableEntitlement(uint256 spaceId, string calldata tag)
    public
  {
    address ownerAddress = ISpaceManager(_spaceManager).getSpaceOwnerBySpaceId(
      spaceId
    );

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        spaceId
      ];

    spacePurchasableEntitlements.entitlementsByTag[tag].isActive = false;
  }

  function removeEntitlement(
    uint256 spaceId,
    uint256,
    uint256[] calldata,
    bytes calldata
  ) external view override onlySpaceManager {
    address ownerAddress = ISpaceManager(_spaceManager).getSpaceOwnerBySpaceId(
      spaceId
    );

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );
  }

  function purchaseEntitlement(uint256 spaceId, string calldata tag)
    public
    payable
  {
    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        spaceId
      ];
    PurchasableEntitlement
      memory purchasableEntitlement = spacePurchasableEntitlements
        .entitlementsByTag[tag];

    require(purchasableEntitlement.price == msg.value, "Wrong value sent");

    PurchasedSpaceEntitlements
      storage purchasedSpaceEntitlements = purchasedEntitlementsBySpaceId[
        spaceId
      ];
    purchasedSpaceEntitlements.userPurchasedEntitlements[msg.sender].push(tag);

    valueBySpaceId[spaceId] += msg.value;
  }

  function isEntitled(
    uint256 spaceId,
    uint256 roomId,
    address user,
    DataTypes.Permission memory permission
  ) public view override returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);
    string[] memory purchasedEntitlements = purchasedEntitlementsBySpaceId[
      spaceId
    ].userPurchasedEntitlements[user];
    if (roomId > 0) {
      return false;
    }
    for (uint256 i = 0; i < purchasedEntitlements.length; i++) {
      string memory entitlementTag = purchasedEntitlements[i];
      PurchasableEntitlement
        memory purchasableEntitlement = purchasableEntitlementsBySpaceId[
          spaceId
        ].entitlementsByTag[entitlementTag];
      if (purchasableEntitlement.isActive) {
        DataTypes.Permission[] memory permissions = spaceManager
          .getPermissionsBySpaceIdByRoleId(
            spaceId,
            purchasableEntitlement.roleId
          );

        for (uint256 k = 0; k < permissions.length; k++) {
          if (
            keccak256(abi.encodePacked(permissions[k].name)) ==
            keccak256(abi.encodePacked(permission.name))
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function isTransitivelyEntitled(
    uint256 spaceId,
    uint256 roomId,
    address userAddress,
    uint256 roleId
  ) public view override returns (bool) {
    string[] memory purchasedEntitlements = purchasedEntitlementsBySpaceId[
      spaceId
    ].userPurchasedEntitlements[userAddress];
    if (roomId > 0) {
      return false;
    }

    for (uint256 i = 0; i < purchasedEntitlements.length; i++) {
      string memory entitlementTag = purchasedEntitlements[i];
      PurchasableEntitlement
        memory purchasableEntitlement = purchasableEntitlementsBySpaceId[
          spaceId
        ].entitlementsByTag[entitlementTag];
      if (purchasableEntitlement.isActive) {
        if (purchasableEntitlement.roleId == roleId) {
          return true;
        }
      }
    }

    return false;
  }

  function getUserRoles(
    uint256 spaceId,
    uint256,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    string[] memory purchasedEntitlements = purchasedEntitlementsBySpaceId[
      spaceId
    ].userPurchasedEntitlements[user];
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      purchasedEntitlements.length
    );
    //This is buggy atm because we store an array of role Ids per purchase and that makes it hard to know the total size
    for (uint256 i = 0; i < purchasedEntitlements.length; i++) {
      string memory entitlementTag = purchasedEntitlements[i];
      PurchasableEntitlement
        memory purchasableEntitlement = purchasableEntitlementsBySpaceId[
          spaceId
        ].entitlementsByTag[entitlementTag];
      if (purchasableEntitlement.isActive) {
        DataTypes.Role memory role = ISpaceManager(_spaceManager)
          .getRoleBySpaceIdByRoleId(spaceId, purchasableEntitlement.roleId);
        //Here is the bug it will get overwritten
        roles[0] = role;
      }
    }

    return roles;
  }

  function withdrawValue(uint256 spaceId) public returns (uint256) {
    address ownerAddress = ISpaceManager(_spaceManager).getSpaceOwnerBySpaceId(
      spaceId
    );

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    require(valueBySpaceId[spaceId] > 0, "No value to withdraw");

    uint256 balance = valueBySpaceId[spaceId];
    valueBySpaceId[spaceId] = 0;

    address payable receiver = payable(msg.sender);
    (bool transferTx, ) = receiver.call{value: balance}("");
    if (!transferTx) {
      revert("Could not transfer value");
    }
    return balance;
  }
}
