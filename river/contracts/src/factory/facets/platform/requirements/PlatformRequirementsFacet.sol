// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "./IPlatformRequirements.sol";

// libraries

// contracts
import {PlatformRequirementsBase} from "./PlatformRequirementsBase.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract PlatformRequirementsFacet is
  IPlatformRequirements,
  PlatformRequirementsBase,
  OwnableBase,
  Facet
{
  function __PlatformRequirements_init(
    address feeRecipient,
    uint16 membershipBps,
    uint256 membershipFee,
    uint256 membershipMintLimit,
    uint64 membershipDuration
  ) external onlyInitializing {
    _addInterface(type(IPlatformRequirements).interfaceId);
    _setFeeRecipient(feeRecipient);
    _setMembershipBps(membershipBps);
    _setMembershipFee(membershipFee);
    _setMembershipMintLimit(membershipMintLimit);
    _setMembershipDuration(membershipDuration);
  }

  /// @inheritdoc IPlatformRequirements
  function getFeeRecipient() external view returns (address) {
    return _getFeeRecipient();
  }

  /// @inheritdoc IPlatformRequirements
  function getMembershipBps() external view returns (uint16) {
    return _getMembershipBps();
  }

  /// @inheritdoc IPlatformRequirements
  function getMembershipFee() external view returns (uint256) {
    return _getMembershipFee();
  }

  /// @inheritdoc IPlatformRequirements
  function getMembershipMintLimit() external view returns (uint256) {
    return _getMembershipMintLimit();
  }

  /// @inheritdoc IPlatformRequirements
  function getMembershipDuration() external view returns (uint64) {
    return _getMembershipDuration();
  }

  /// @inheritdoc IPlatformRequirements
  function setFeeRecipient(address recipient) external onlyOwner {
    _setFeeRecipient(recipient);
  }

  /// @inheritdoc IPlatformRequirements
  function setMembershipBps(uint16 bps) external onlyOwner {
    _setMembershipBps(bps);
  }

  /// @inheritdoc IPlatformRequirements
  function setMembershipFee(uint256 fee) external onlyOwner {
    _setMembershipFee(fee);
  }

  /// @inheritdoc IPlatformRequirements
  function setMembershipMintLimit(uint256 limit) external onlyOwner {
    _setMembershipMintLimit(limit);
  }

  /// @inheritdoc IPlatformRequirements
  function setMembershipDuration(uint64 duration) external onlyOwner {
    _setMembershipDuration(duration);
  }

  /// @inheritdoc IPlatformRequirements
  function getDenominator() external pure returns (uint256) {
    return _getDenominator();
  }
}
