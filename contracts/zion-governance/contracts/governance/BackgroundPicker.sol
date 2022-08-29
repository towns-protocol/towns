//SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BackgroundPicker is Ownable {
  uint256 private currentVal;

  event ValChanged(uint256 newVal);

  function store(uint256 newVal) public onlyOwner {
    currentVal = newVal;
    emit ValChanged(currentVal);
  }

  function getVal() public view returns (uint256) {
    return currentVal;
  }
}
