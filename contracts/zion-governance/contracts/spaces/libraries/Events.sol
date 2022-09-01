//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Events {
  event CreateSpace(
    address indexed owner,
    string indexed spaceName,
    uint256 indexed spaceId
  );
}
