//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ClaimPool {
  uint256 private zionTokenBalance;
  address private zionTokenAddress;
  IERC20 private zionToken;

  mapping(address => bool) claimedAddresses;

  uint256 private constant ONE_TIME_CLAIM_AMOUNT = 500;
  uint256 private constant UNRESTRICTED_CLAIM_AMOUNT = 5;

  constructor(address _zionTokenAddress) {
    console.log("Deploying the claim pool", _zionTokenAddress);
    zionTokenAddress = _zionTokenAddress;
    zionToken = IERC20(_zionTokenAddress);
  }

  function getZionTokenBalance() public view returns (uint256) {
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
    console.log("Claiming ZION tokens from %s", msg.sender);
    if (msg.sender != address(0) && !claimedAddresses[msg.sender]) {
      claimedAddresses[msg.sender] = true;

      address payable claimer = payable(msg.sender);
      uint256 claimAmount = ONE_TIME_CLAIM_AMOUNT * 10**18;

      zionToken.transfer(claimer, claimAmount);

      console.log("Claimed %s ZION tokens from %s", claimAmount, msg.sender);
    }
  }

  function claimUnrestrictedTokens() public {
    console.log("Claiming ZION tokens from %s", msg.sender);

    claimedAddresses[msg.sender] = true;

    address payable claimer = payable(msg.sender);
    uint256 claimAmount = UNRESTRICTED_CLAIM_AMOUNT * 10**18;

    zionToken.transfer(claimer, claimAmount);

    console.log("Claimed %s ZION tokens from %s", claimAmount, msg.sender);
  }
}
