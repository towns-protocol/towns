// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces
import {ISpace} from "./interfaces/ISpace.sol";
import {ISpaceUpgrades} from "./interfaces/ISpaceUpgrades.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {Permissions} from "./libraries/Permissions.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StorageSlotUpgradeable} from "openzeppelin-contracts-upgradeable/utils/StorageSlotUpgradeable.sol";

// contracts
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SpaceFactory} from "./SpaceFactory.sol";

contract SpaceUpgrades is UUPSUpgradeable, OwnableUpgradeable, ISpaceUpgrades {
  using EnumerableSet for EnumerableSet.AddressSet;

  mapping(address => UpgradeInfo) public upgradesBySpaceAddress;
  EnumerableSet.AddressSet internal _spaceByIndex;

  uint256 public delayPeriod;
  address public spaceFactoryAddress;

  constructor() {
    _disableInitializers();
  }

  function initialize(
    address spaceFactory_,
    uint256 delayPeriod_
  ) public initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();

    if (delayPeriod_ == 0) revert InvalidDelayPeriod();
    if (spaceFactory_ == address(0)) revert InvalidSpaceFactoryAddress();

    spaceFactoryAddress = spaceFactory_;
    delayPeriod = delayPeriod_;
  }

  function setDelayPeriod(uint256 delayPeriod_) external onlyOwner {
    if (delayPeriod_ < block.timestamp) revert InvalidDelayPeriod();
    if (delayPeriod_ <= delayPeriod) revert InvalidDelayPeriod();

    delayPeriod = delayPeriod_;
  }

  function registered() external view returns (UpgradeInfo[] memory) {
    uint256 len = _spaceByIndex.length();

    UpgradeInfo[] memory spaceUpgradeInfo = new UpgradeInfo[](len);

    for (uint256 i = 0; i < len; i++) {
      address space = _spaceByIndex.at(i);
      spaceUpgradeInfo[i] = upgradesBySpaceAddress[space];
    }

    return spaceUpgradeInfo;
  }

  function register(address space, address implementation) external {
    if (ISpace(space).owner() != _msgSender()) revert NotSpaceOwner();
    if (!_isSpaceInterface(space)) revert InvalidInterface();

    if (upgradesBySpaceAddress[space].space != address(0))
      revert SpaceAlreadyRegistered();

    _spaceByIndex.add(space);
    upgradesBySpaceAddress[space].space = space;
    upgradesBySpaceAddress[space].implementation = implementation;
  }

  function unregister(address space) external {
    if (ISpace(space).owner() != _msgSender()) revert NotSpaceOwner();
    if (upgradesBySpaceAddress[space].space == address(0))
      revert SpaceNotRegistered();

    _spaceByIndex.remove(space);
    delete upgradesBySpaceAddress[space];
  }

  function upgrade(address space) external {
    // verify delay period has passed
    if (delayPeriod > block.timestamp) revert UpgradeNotAllowed();
    if (upgradesBySpaceAddress[space].space == address(0))
      revert SpaceNotRegistered();

    address latestImplementation = SpaceFactory(spaceFactoryAddress)
      .SPACE_IMPLEMENTATION_ADDRESS();

    if (upgradesBySpaceAddress[space].implementation == latestImplementation)
      revert SpaceAlreadyUpgraded();

    if (
      ISpace(upgradesBySpaceAddress[space].space).contractVersion() >=
      ISpace(latestImplementation).contractVersion()
    ) revert UpgradeNotAllowed();

    if (!_isAllowed(address(this), space)) revert NotEntitled();

    _upgradeSpace(space, latestImplementation);
  }

  // =============================================================
  //                         Internal
  // =============================================================
  function _upgradeSpace(address space, address implementation) internal {
    // update implementation of space
    upgradesBySpaceAddress[space].implementation = implementation;

    // call upgradeToAndCall on space
    UUPSUpgradeable(space).upgradeTo(implementation);
  }

  function _isSpaceInterface(address space) internal view returns (bool) {
    return IERC165(space).supportsInterface(type(ISpace).interfaceId);
  }

  function _isAllowed(
    address caller,
    address space
  ) internal view returns (bool) {
    return ISpace(space).isEntitledToSpace(caller, Permissions.Upgrade);
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  /**
   * @dev Added to allow future versions to add new variables in case this contract becomes
   *      inherited. See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
   */
  uint256[49] private __gap;
}
