//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/console.sol";
import {ISpaceManager} from "./../interfaces/ISpaceManager.sol";
import {ISpaceEntitlementModule} from "./../interfaces/ISpaceEntitlementModule.sol";
import {DataTypes} from "./../libraries/DataTypes.sol";
import {IERC20} from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract PurchasableEntitlementModule is ERC165, ISpaceEntitlementModule {
  address public immutable zionSpaceManager;

  mapping(uint256 => SpacePurchasableEntitlements) purchasableEntitlementsBySpaceId;

  struct SpacePurchasableEntitlements {
    mapping(string => PurchasableEntitlement) entitlementsByTag;
  }

  struct PurchasableEntitlement {
    string description;
    uint256 price;
    DataTypes.EntitlementType[] entitlementTypes;
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

  constructor(address _zionSpaceManager) {
    zionSpaceManager = _zionSpaceManager;
  }

  function setPurchasableEntitlement(
    DataTypes.PurchasableEntitlementData calldata vars
  ) public {
    ISpaceManager spaceManager = ISpaceManager(zionSpaceManager);
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(vars.spaceId);

    require(
      ownerAddress == msg.sender || msg.sender == zionSpaceManager,
      "Only the owner can update entitlements"
    );

    if (vars.value == 0) {
      revert("No value provided");
    }

    if (vars.entitlementTypes.length == 0) {
      revert("No entitlement types provided");
    }

    if (
      purchasableEntitlementsBySpaceId[vars.spaceId]
        .entitlementsByTag[vars.tag]
        .price != 0
    ) {
      revert("Entitlement tag already exists");
    }

    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        vars.spaceId
      ];
    spacePurchasableEntitlements.entitlementsByTag[
      vars.tag
    ] = PurchasableEntitlement(
      vars.description,
      vars.value,
      vars.entitlementTypes,
      true
    );
  }

  function disablePurchasableEntitlement(uint256 spaceId, string calldata tag)
    public
  {
    ISpaceManager spaceManager = ISpaceManager(zionSpaceManager);
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    require(
      ownerAddress == msg.sender || msg.sender == zionSpaceManager,
      "Only the owner can update entitlements"
    );

    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        spaceId
      ];

    spacePurchasableEntitlements.entitlementsByTag[tag].isActive = false;
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
    DataTypes.EntitlementType entitlementType
  ) public view returns (bool) {
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
        for (
          uint256 j = 0;
          j < purchasableEntitlement.entitlementTypes.length;
          j++
        ) {
          DataTypes.EntitlementType purchasedEntitlementType = purchasableEntitlement
              .entitlementTypes[j];
          if (entitlementType == purchasedEntitlementType) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function withdrawValue(uint256 spaceId) public returns (uint256) {
    ISpaceManager spaceManager = ISpaceManager(zionSpaceManager);
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    require(
      ownerAddress == msg.sender || msg.sender == zionSpaceManager,
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

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC165)
    returns (bool)
  {
    return
      interfaceId == type(ISpaceEntitlementModule).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
