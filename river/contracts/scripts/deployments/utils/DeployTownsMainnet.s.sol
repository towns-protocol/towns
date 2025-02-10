// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//interfaces
import {ITownsBase} from "contracts/src/tokens/towns/mainnet/ITowns.sol";

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Towns} from "contracts/src/tokens/towns/mainnet/Towns.sol";

contract DeployTownsMainnet is Deployer, ITownsBase {
  address public manager;
  address public vault;

  function inflationConfig(
    address _manager
  ) public pure returns (InflationConfig memory) {
    return
      InflationConfig({
        initialMintTime: 1_709_667_671, // Tuesday, March 5, 2024 7:41:11 PM
        initialInflationRate: 800,
        finalInflationRate: 200,
        inflationDecayRate: 600,
        finalInflationYears: 20,
        inflationReceiver: _manager
      });
  }

  function versionName() public pure override returns (string memory) {
    return "townsMainnet";
  }

  function __deploy(address deployer) public override returns (address) {
    manager = _getManager();
    vault = _getVault();
    InflationConfig memory config = inflationConfig(manager);

    vm.broadcast(deployer);
    return
      address(
        new Towns{
          salt: 0x9f2667b9ec9a7d09a47d87156f032c6735a077adfe74d91cc4d708e8da080040
        }({vault: vault, manager: manager, config: config})
      );
  }

  function _getVault() internal view returns (address) {
    // Mainnet
    if (block.chainid == 1) {
      return address(0x23b168657744124360d3553F3bc257f3E28cBaf9);
    } else if (block.chainid == 11155111) {
      return address(0x23b168657744124360d3553F3bc257f3E28cBaf9);
    } else if (block.chainid == 31337 || block.chainid == 31338) {
      return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266); // anvil deployer
    } else {
      revert("DeployTownsMainnet: Invalid network");
    }
  }

  function _getManager() internal view returns (address) {
    if (block.chainid == 1) {
      return address(0x18038ee5692FCE1cc0B0b3F2D63e09639A597F94);
    } else if (block.chainid == 11155111) {
      return address(0x18038ee5692FCE1cc0B0b3F2D63e09639A597F94);
    } else if (block.chainid == 31337 || block.chainid == 31338) {
      return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266); // anvil deployer
    } else {
      revert("DeployTownsMainnet: Invalid network");
    }
  }
}
