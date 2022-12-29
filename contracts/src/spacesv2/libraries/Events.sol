//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

library Events {
  event SpaceCreated(
    address indexed spaceAddress,
    address indexed ownerAddress,
    string networkId
  );
}
