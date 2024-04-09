// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMembership} from "./IMembership.sol";
import {IMembershipPricing} from "./pricing/IMembershipPricing.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";
//import {IEntitlementChecker} from "contracts/src/crosschain/checker/IEntitlementChecker.sol";
import {IEntitlementGatedBase} from "contracts/src/crosschain/IEntitlementGated.sol";
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {console2} from "forge-std/console2.sol";
// contracts
import {MembershipBase} from "./MembershipBase.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {ERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/ERC5643Base.sol";
import {ReentrancyGuard} from "contracts/src/diamond/facets/reentrancy/ReentrancyGuard.sol";
import {Entitled} from "contracts/src/spaces/facets/Entitled.sol";
import {MembershipReferralBase} from "./referral/MembershipReferralBase.sol";
import {EntitlementGated} from "./../../../crosschain/EntitlementGated.sol";
import {MembershipStorage} from "./MembershipStorage.sol";
import {RolesBase} from "contracts/src/spaces/facets/roles/RolesBase.sol";

contract MembershipFacet is
  IMembership,
  MembershipBase,
  MembershipReferralBase,
  ERC5643Base,
  ReentrancyGuard,
  ERC721A,
  Entitled,
  RolesBase,
  EntitlementGated
{
  bytes32 constant JOIN_SPACE =
    bytes32(abi.encodePacked(Permissions.JoinSpace));

  function __Membership_init(
    Membership memory info,
    address spaceFactory
  ) external onlyInitializing {
    console2.log("MembershipFacet.__Membership_init");
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
    _transferOut(_getMembershipCurrency(), address(this), account, balance);
  }

  // =============================================================
  //                           Minting
  // =============================================================
  function _validateJoinSpace(address receiver) internal view {
    if (receiver == address(0)) revert Membership__InvalidAddress();
    if (_balanceOf(msg.sender) > 0) revert Membership__AlreadyMember();
    if (_balanceOf(receiver) > 0) revert Membership__AlreadyMember();

    if (
      _getMembershipSupplyLimit() != 0 &&
      _totalSupply() >= _getMembershipSupplyLimit()
    ) revert Membership__MaxSupplyReached();
  }

  /// @inheritdoc IMembership
  function getTokenIdByMembership(
    address member
  ) external view returns (uint256) {
    return _getTokenIdByMembership(member);
  }

  // =============================================================
  //                           Join
  // =============================================================

  /// @inheritdoc IMembership
  function joinSpace(address receiver) external payable nonReentrant {
    _validateJoinSpace(receiver);
    address sender = msg.sender;
    bool isCrosschainPending = false;

    IRolesBase.Role[] memory roles = _getRolesWithPermission(
      Permissions.JoinSpace
    );
    for (uint256 i = 0; i < roles.length; i++) {
      IRolesBase.Role memory role = roles[i];

      if (!role.disabled) {
        for (uint256 j = 0; j < role.entitlements.length; j++) {
          IEntitlement entitlement = IEntitlement(role.entitlements[j]);
          if (!entitlement.isCrosschain()) {
            address[] memory users = new address[](1);
            users[0] = sender;
            if (entitlement.isEntitled(0x0, users, JOIN_SPACE)) {
              _issueToken(receiver);
              return;
            }
          } else {
            IRuleEntitlement re = IRuleEntitlement(address(entitlement));
            IRuleEntitlement.RuleData memory ruleData = re.getRuleData(role.id);

            if (
              ruleData.operations.length == 1 &&
              ruleData.operations[0].opType ==
              IRuleEntitlement.CombinedOperationType.NONE
            ) {
              //console2.log("crosschain entitlement noop rule, skipping");
            } else {
              bytes memory encodedRuleData = re.encodeRuleData(ruleData);
              bytes32 txId = _requestEntitlementCheck(encodedRuleData);
              MembershipStorage.Layout storage ds = MembershipStorage.layout();
              ds.pendingJoinRequests[txId] = receiver;
              isCrosschainPending = true;
            }
          }
        }
      }
    }
    if (!isCrosschainPending) {
      revert Entitlement__NotAllowed();
    }
  }

  function _issueToken(address receiver) internal {
    // allocate protocol and membership fees
    uint256 membershipPrice = _getMembershipPrice(_totalSupply());
    uint256 tokenId = _nextTokenId();

    if (membershipPrice > 0) {
      // set renewal price for token
      _setMembershipRenewalPrice(tokenId, membershipPrice);
      uint256 protocolFee = _collectProtocolFee(receiver, membershipPrice);

      uint256 surplus = membershipPrice - protocolFee;
      if (surplus > 0) _transferIn(receiver, surplus);
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
        _transferOut(currency, receiver, referrer, referralFee);

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

  /// @inheritdoc EntitlementGated
  function _onEntitlementCheckResultPosted(
    bytes32 transactionId,
    IEntitlementGatedBase.NodeVoteStatus result
  ) internal override {
    MembershipStorage.Layout storage ds = MembershipStorage.layout();

    // get trasnaction from memmbership storage
    if (result == NodeVoteStatus.PASSED) {
      address receiver = ds.pendingJoinRequests[transactionId];
      _issueToken(receiver);
      delete ds.pendingJoinRequests[transactionId];
    } else {
      address receiver = ds.pendingJoinRequests[transactionId];
      emit MembershipTokenRejected(receiver);
      delete ds.pendingJoinRequests[transactionId];
    }
  }

  // =============================================================
  //                           Renewal
  // =============================================================

  /// @inheritdoc IMembership
  function renewMembership(uint256 tokenId) external payable nonReentrant {
    address receiver = _ownerOf(tokenId);

    if (receiver == address(0)) revert Membership__InvalidAddress();

    // should we wait for expiration to renew?
    if (!_isRenewable(tokenId)) revert Membership__NotExpired();

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
  //                           Cancellation
  // =============================================================

  /// @inheritdoc IMembership
  function cancelMembership(uint256 tokenId) external nonReentrant {
    if (!_isApprovedOrOwner(tokenId))
      revert ApprovalCallerNotOwnerNorApproved();

    _burn(tokenId);
    _cancelSubscription(tokenId);
  }

  // =============================================================
  //                           Duration
  // =============================================================

  function setMembershipDuration(uint64 newDuration) external onlyOwner {}

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
  //                           Factory
  // =============================================================

  /// @inheritdoc IMembership
  function getSpaceFactory() external view returns (address) {
    return _getSpaceFactory();
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _isApprovedOrOwner(uint256 tokenId) internal view returns (bool) {
    address owner = _ownerOf(tokenId);
    address sender = msg.sender;

    return
      (sender == owner) ||
      _isApprovedForAll(owner, sender) ||
      _getApproved(tokenId) == sender;
  }

  // =============================================================
  //                           Overrides
  // =============================================================

  // ERC5643 overrides
  /// @dev only renewable if the expiration of the current membership is less than the default duration + current time. To prevent people from renewing too early.
  function _isRenewable(uint256 tokenId) internal view override returns (bool) {
    return _expiresAt(tokenId) < _getMembershipDuration() + block.timestamp;
  }

  // ERC721A overrides
  // =============================================================
  function balanceOf(address account) public view override returns (uint256) {
    // check if expiration has been reached, return 0 if so
    if (_expiresAt(_getTokenIdByMembership(account)) <= block.timestamp) {
      return 0;
    }

    return _balanceOf(account);
  }

  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 startTokenId,
    uint256 quantity
  ) internal override {
    super._beforeTokenTransfers(from, to, startTokenId, quantity);
    _setMembershipTokenId(startTokenId, to);
  }

  // For testing
  function requestEntitlementCheck() external override returns (bytes32) {
    revert Entitlement__NotAllowed();
  }
}
