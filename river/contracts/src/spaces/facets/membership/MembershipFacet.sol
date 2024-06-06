// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembership} from "./IMembership.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {MembershipBase} from "./MembershipBase.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {ERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/ERC5643Base.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";
import {MembershipReferralBase} from "./referral/MembershipReferralBase.sol";
import {RolesBase} from "contracts/src/spaces/facets/roles/RolesBase.sol";
import {DispatcherBase} from "contracts/src/spaces/facets/dispatcher/DispatcherBase.sol";
import {EntitlementGated} from "contracts/src/spaces/facets/gated/EntitlementGated.sol";

contract MembershipFacet is
  IMembership,
  MembershipBase,
  MembershipReferralBase,
  ERC5643Base,
  ReentrancyGuard,
  ERC721A,
  Entitled,
  RolesBase,
  DispatcherBase,
  EntitlementGated
{
  bytes32 constant JOIN_SPACE =
    bytes32(abi.encodePacked(Permissions.JoinSpace));

  /// @dev Initialization logic when facet is added to diamond
  function __Membership_init(
    Membership memory info,
    address spaceFactory
  ) external onlyInitializing {
    _addInterface(type(IMembership).interfaceId);
    __MembershipBase_init(info, spaceFactory);
    __ERC721A_init_unchained(info.name, info.symbol);
  }

  // =============================================================
  //                           Withdrawal
  // =============================================================
  function withdraw(address account) external onlyOwner {
    if (account == address(0)) revert Membership__InvalidAddress();
    uint256 balance = _getCreatorBalance();
    if (balance == 0) revert Membership__InsufficientPayment();
    CurrencyTransfer.transferCurrency(
      _getMembershipCurrency(),
      address(this),
      account,
      balance
    );
  }

  // =============================================================
  //                           Minting
  // =============================================================
  function _validateJoinSpace(address receiver) internal view {
    if (receiver == address(0)) revert Membership__InvalidAddress();
    if (
      _getMembershipSupplyLimit() != 0 &&
      _totalSupply() >= _getMembershipSupplyLimit()
    ) revert Membership__MaxSupplyReached();
  }

  // =============================================================
  //                           Join
  // =============================================================

  /// @inheritdoc IMembership
  function joinSpace(address receiver) external payable nonReentrant {
    _validateJoinSpace(receiver);

    address sender = msg.sender;
    bytes32 keyHash = keccak256(abi.encodePacked(sender, block.number));
    bytes32 transactionId = _makeDispatchId(
      keyHash,
      _makeDispatchInputSeed(keyHash, sender, _useDispatchNonce(keyHash))
    );

    _captureData(transactionId, abi.encode(sender, receiver));
    if (msg.value > 0) {
      _captureValue(transactionId, msg.value);
    }

    IRolesBase.Role[] memory roles = _getRolesWithPermission(
      Permissions.JoinSpace
    );

    bool isCrosschainPending;
    bool shouldRefund;

    address[] memory linkedWallets = _getLinkedWalletsWithUser(msg.sender);
    uint256 rolesLen = roles.length;

    for (uint256 i = 0; i < rolesLen; i++) {
      IRolesBase.Role memory role = roles[i];

      if (!role.disabled) {
        for (uint256 j = 0; j < role.entitlements.length; j++) {
          IEntitlement entitlement = IEntitlement(role.entitlements[j]);

          if (!entitlement.isCrosschain()) {
            if (entitlement.isEntitled(IN_TOWN, linkedWallets, JOIN_SPACE)) {
              _issueToken(transactionId);
              return;
            } else {
              shouldRefund = true;
            }
          } else {
            _requestEntitlementCheck(
              transactionId,
              IRuleEntitlement(address(entitlement)),
              role.id
            );
            shouldRefund = false;
            isCrosschainPending = true;
          }
        }
      }
    }

    if (!isCrosschainPending && shouldRefund) {
      _captureData(transactionId, "");
      if (msg.value > 0) {
        _releaseCapturedValue(transactionId, msg.value);
      }
      emit MembershipTokenRejected(receiver);
    }
  }

  function _issueToken(bytes32 transactionId) internal {
    (address sender, address receiver) = abi.decode(
      _getCapturedData(transactionId),
      (address, address)
    );

    // allocate protocol and membership fees
    uint256 membershipPrice = _getMembershipPrice(_totalSupply());
    uint256 tokenId = _nextTokenId();

    if (membershipPrice > 0) {
      uint256 userValue = _getCapturedValue(transactionId);

      if (userValue == 0) revert Membership__InsufficientPayment();
      if (membershipPrice > userValue) revert Membership__InsufficientPayment();

      // set renewal price for token
      _setMembershipRenewalPrice(tokenId, membershipPrice);
      uint256 protocolFee = _collectProtocolFee(sender, membershipPrice);

      uint256 surplus = membershipPrice - protocolFee;
      if (surplus > 0) _transferIn(sender, surplus);

      // release captured value
      _releaseCapturedValue(transactionId, membershipPrice);
      _captureData(transactionId, "");
    }

    // mint membership
    _safeMint(receiver, 1);

    // set expiration of membership
    _renewSubscription(tokenId, _getMembershipDuration());
    emit MembershipTokenIssued(receiver, tokenId);
  }

  /// @inheritdoc IMembership
  function joinSpaceWithReferral(
    address receiver,
    address referrer,
    uint256 referralCode
  ) external payable nonReentrant {
    _validateJoinSpace(receiver);

    // get token id
    uint256 tokenId = _nextTokenId();

    // allocate protocol, membership and referral fees
    uint256 membershipPrice = _getMembershipPrice(_totalSupply());

    if (membershipPrice > 0) {
      // set renewal price for referral
      _setMembershipRenewalPrice(tokenId, membershipPrice);

      uint256 protocolFee = _collectProtocolFee(receiver, membershipPrice);
      uint256 surplus = membershipPrice - protocolFee;
      address currency = _getMembershipCurrency();

      if (surplus > 0) {
        // calculate referral fee from net membership price
        uint256 referralFee = _calculateReferralAmount(surplus, referralCode);
        CurrencyTransfer.transferCurrency(
          currency,
          receiver,
          referrer,
          referralFee
        );

        // transfer remaining amount to fee recipient
        uint256 recipientFee = surplus - referralFee;
        if (recipientFee > 0) _transferIn(receiver, recipientFee);
      }
    }

    // mint membership
    _safeMint(receiver, 1);

    // set expiration of membership
    _renewSubscription(tokenId, _getMembershipDuration());
  }

  // =============================================================
  //                           Renewal
  // =============================================================

  /// @inheritdoc IMembership
  function renewMembership(uint256 tokenId) external payable nonReentrant {
    address receiver = _ownerOf(tokenId);

    if (receiver == address(0)) revert Membership__InvalidAddress();

    // validate if the current expiration is 365 or more
    uint256 expiration = _expiresAt(tokenId);
    if (expiration - block.timestamp >= _getMembershipDuration())
      revert Membership__NotExpired();

    // allocate protocol and membership fees
    uint256 membershipPrice = _getMembershipRenewalPrice(
      tokenId,
      _totalSupply()
    );

    if (membershipPrice > 0) {
      uint256 protocolFee = _collectProtocolFee(receiver, membershipPrice);
      uint256 surplus = membershipPrice - protocolFee;
      if (surplus > 0) _transferIn(receiver, surplus);
    }

    _renewSubscription(tokenId, _getMembershipDuration());
  }

  /// @inheritdoc IMembership
  function expiresAt(uint256 tokenId) external view returns (uint256) {
    return _expiresAt(tokenId);
  }

  // =============================================================
  //                           Duration
  // =============================================================

  /// @inheritdoc IMembership
  function getMembershipDuration() external view returns (uint64) {
    return _getMembershipDuration();
  }

  // =============================================================
  //                        Pricing Module
  // =============================================================
  /// @inheritdoc IMembership
  function setMembershipPricingModule(
    address pricingModule
  ) external onlyOwner {
    _verifyPricingModule(pricingModule);
    _setPricingModule(pricingModule);
  }

  /// @inheritdoc IMembership
  function getMembershipPricingModule() external view returns (address) {
    return _getPricingModule();
  }

  // =============================================================
  //                           Pricing
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipPrice(uint256 newPrice) external onlyOwner {
    _verifyPrice(newPrice);
    IMembershipPricing(_getPricingModule()).setPrice(newPrice);
  }

  /// @inheritdoc IMembership
  function getMembershipPrice() external view returns (uint256) {
    return _getMembershipPrice(_totalSupply());
  }

  /// @inheritdoc IMembership
  function getMembershipRenewalPrice(
    uint256 tokenId
  ) external view returns (uint256) {
    return _getMembershipRenewalPrice(tokenId, _totalSupply());
  }

  // =============================================================
  //                           Allocation
  // =============================================================
  /// @inheritdoc IMembership
  function setMembershipFreeAllocation(
    uint256 newAllocation
  ) external onlyOwner {
    // get current supply limit
    uint256 currentSupplyLimit = _getMembershipSupplyLimit();

    // verify newLimit is not more than the max supply limit
    if (currentSupplyLimit != 0 && newAllocation > currentSupplyLimit)
      revert Membership__InvalidFreeAllocation();

    // verify newLimit is not more than the allowed platform limit
    _verifyFreeAllocation(newAllocation);
    _setMembershipFreeAllocation(newAllocation);
  }

  /// @inheritdoc IMembership
  function getMembershipFreeAllocation() external view returns (uint256) {
    return _getMembershipFreeAllocation();
  }

  // =============================================================
  //                    Token Max Supply Limit
  // =============================================================

  /// @inheritdoc IMembership
  function setMembershipLimit(uint256 newLimit) external onlyOwner {
    _verifyMaxSupply(newLimit, _totalSupply());
    _setMembershipSupplyLimit(newLimit);
  }

  /// @inheritdoc IMembership
  function getMembershipLimit() external view returns (uint256) {
    return _getMembershipSupplyLimit();
  }

  // =============================================================
  //                           Currency
  // =============================================================

  /// @inheritdoc IMembership
  function getMembershipCurrency() external view returns (address) {
    return _getMembershipCurrency();
  }

  // =============================================================
  //                           Image
  // =============================================================
  function setMembershipImage(string calldata newImage) external onlyOwner {
    _setMembershipImage(newImage);
  }

  function getMembershipImage() external view returns (string memory) {
    return _getMembershipImage();
  }

  // =============================================================
  //                           Factory
  // =============================================================

  /// @inheritdoc IMembership
  function getSpaceFactory() external view returns (address) {
    return _getSpaceFactory();
  }

  // =============================================================
  //                           Overrides
  // =============================================================

  /// @dev Hook called after a node has posted the result of an entitlement check
  function _onEntitlementCheckResultPosted(
    bytes32 transactionId,
    IEntitlementGatedBase.NodeVoteStatus result
  ) internal override {
    if (result == NodeVoteStatus.PASSED) {
      _issueToken(transactionId);
    } else {
      (address sender, address receiver) = abi.decode(
        _getCapturedData(transactionId),
        (address, address)
      );

      _captureData(transactionId, "");
      _refundBalance(transactionId, sender);

      emit MembershipTokenRejected(receiver);
    }
  }

  function _refundBalance(bytes32 transactionId, address sender) internal {
    uint256 userValue = _getCapturedValue(transactionId);
    if (userValue > 0) {
      _releaseCapturedValue(transactionId, userValue);
      CurrencyTransfer.transferCurrency(
        _getMembershipCurrency(),
        address(this),
        sender,
        userValue
      );
    }
  }
}
