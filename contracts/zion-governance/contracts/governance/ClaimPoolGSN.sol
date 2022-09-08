//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

contract ClaimPoolGSN is BaseRelayRecipient {
  uint256 private zionTokenBalance;
  address private zionTokenAddress;
  IERC20 private zionToken;

  mapping(address => bool) private claimedAddresses;

  uint256 private constant ONE_TIME_CLAIM_AMOUNT = 500;
  uint256 private constant UNRESTRICTED_CLAIM_AMOUNT = 5;

  constructor(address _zionTokenAddress, address forwarder) {
    console.log("Deploying the claim pool", _zionTokenAddress);
    _setTrustedForwarder(forwarder);
    zionTokenAddress = _zionTokenAddress;
    zionToken = IERC20(_zionTokenAddress);
  }

  string public override versionRecipient = "2.2.0";

  // function versionRecipient() external view returns (string memory) {
  //     return "2.2.0";
  // }

  function getZionTokenBalance() public pure returns (uint256) {
    return 17;
  }

  function isEligible(address _address) public view returns (bool) {
    console.log("Checking eligibility of", _address);
    if (_address != address(0)) {
      return true;
    }
    return false;
  }

  function hasClaimed(address _address) public view returns (bool) {
    console.log("Checking if address has claimed", _address);
    if (claimedAddresses[_address]) {
      return true;
    }
    return false;
  }

  function claimTokens() public {
    console.log("Claiming ZION tokens from %s", _msgSender());
    if (msg.sender != address(0) && !claimedAddresses[_msgSender()]) {
      claimedAddresses[_msgSender()] = true;

      address payable claimer = payable(_msgSender());
      uint256 claimAmount = ONE_TIME_CLAIM_AMOUNT * 10**18;

      zionToken.transfer(claimer, claimAmount);

      console.log("Claimed %s ZION tokens from %s", claimAmount, _msgSender());
    }
  }

  function claimUnrestrictedTokens() public {
    console.log("Claiming ZION tokens from %s", _msgSender());

    claimedAddresses[_msgSender()] = true;

    address payable claimer = payable(_msgSender());
    uint256 claimAmount = UNRESTRICTED_CLAIM_AMOUNT * 10**18;

    zionToken.transfer(claimer, claimAmount);

    console.log("Claimed %s ZION tokens from %s", claimAmount, _msgSender());
  }
}
