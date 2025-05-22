// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {SimpleApp} from "src/apps/helpers/SimpleApp.sol";
import {CREATE3} from "solady/utils/CREATE3.sol";

library DeploySimpleApp {
    function deploy(address beaconOwner) internal returns (address) {
        address simpleApp = address(new SimpleApp());
        return _deployBeacon(beaconOwner, simpleApp);
    }

    function _deployBeacon(
        address initialOwner,
        address initialImplementation
    ) internal returns (address) {
        // solhint-disable max-line-length
        bytes
            memory creationCode = hex"60406101c73d393d5160205180821760a01c3d3d3e803b1560875781684343a0dc92ed22dbfc558068911c5a209f08d5ec5e557fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b3d38a23d7f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e03d38a3610132806100953d393df35b636d3e283b3d526004601cfdfe3d3560e01c635c60da1b14610120573d3560e01c80638da5cb5b1461010e5780633659cfe61460021b8163f2fde38b1460011b179063715018a6141780153d3d3e684343a0dc92ed22dbfc805490813303610101573d9260068116610089575b508290557f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e03d38a3005b925060048035938460a01c60243610173d3d3e146100ba5782156100ad573861005f565b637448fbae3d526004601cfd5b82803b156100f4578068911c5a209f08d5ec5e557fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b3d38a2005b636d3e283b3d526004601cfd5b6382b429003d526004601cfd5b684343a0dc92ed22dbfc543d5260203df35b68911c5a209f08d5ec5e543d5260203df3";
        bytes memory initcode = abi.encodePacked(
            creationCode,
            abi.encode(initialOwner, initialImplementation)
        );
        bytes32 salt = keccak256(abi.encodePacked(initialOwner, initialImplementation));
        return CREATE3.deployDeterministic(0, initcode, salt);
    }
}
