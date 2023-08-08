//SPDX-License-Identifier: Apache-2.0

/******************************************************************************
 * Copyright 2022 Here Not There, Inc. <oss@hntlabs.com>                      *
 *                                                                            *
 * Licensed under the Apache License, Version 2.0 (the "License");            *
 * you may not use this file except in compliance with the License.           *
 * You may obtain a copy of the License at                                    *
 *                                                                            *
 *     http://www.apache.org/licenses/LICENSE-2.0                             *
 *                                                                            *
 * Unless required by applicable law or agreed to in writing, software        *
 * distributed under the License is distributed on an "AS IS" BASIS,          *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   *
 * See the License for the specific language governing permissions and        *
 * limitations under the License.                                             *
 ******************************************************************************/
pragma solidity 0.8.20;

library FQDNRegex {
  struct State {
    bool accepts;
    function(bytes1) internal pure returns (State memory) func;
  }

  string public constant REGEX = "([a-zA-Z0-9-]+\\.)+[a-zA-Z][a-zA-Z]+";

  function s0(bytes1 c) internal pure returns (State memory) {
    c = c;
    return State(false, s0);
  }

  function s1(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (
      _cint == 45 ||
      (_cint >= 48 && _cint <= 57) ||
      (_cint >= 65 && _cint <= 90) ||
      (_cint >= 97 && _cint <= 122)
    ) {
      return State(false, s2);
    }

    return State(false, s0);
  }

  function s2(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (
      _cint == 45 ||
      (_cint >= 48 && _cint <= 57) ||
      (_cint >= 65 && _cint <= 90) ||
      (_cint >= 97 && _cint <= 122)
    ) {
      return State(false, s3);
    }
    if (_cint == 46) {
      return State(false, s4);
    }

    return State(false, s0);
  }

  function s3(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (
      _cint == 45 ||
      (_cint >= 48 && _cint <= 57) ||
      (_cint >= 65 && _cint <= 90) ||
      (_cint >= 97 && _cint <= 122)
    ) {
      return State(false, s3);
    }
    if (_cint == 46) {
      return State(false, s4);
    }

    return State(false, s0);
  }

  function s4(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (_cint == 45 || (_cint >= 48 && _cint <= 57)) {
      return State(false, s5);
    }
    if ((_cint >= 65 && _cint <= 90) || (_cint >= 97 && _cint <= 122)) {
      return State(false, s6);
    }

    return State(false, s0);
  }

  function s5(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (
      _cint == 45 ||
      (_cint >= 48 && _cint <= 57) ||
      (_cint >= 65 && _cint <= 90) ||
      (_cint >= 97 && _cint <= 122)
    ) {
      return State(false, s7);
    }
    if (_cint == 46) {
      return State(false, s8);
    }

    return State(false, s0);
  }

  function s6(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (_cint == 45 || (_cint >= 48 && _cint <= 57)) {
      return State(false, s7);
    }
    if (_cint == 46) {
      return State(false, s8);
    }
    if ((_cint >= 65 && _cint <= 90) || (_cint >= 97 && _cint <= 122)) {
      return State(true, s9);
    }

    return State(false, s0);
  }

  function s7(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (
      _cint == 45 ||
      (_cint >= 48 && _cint <= 57) ||
      (_cint >= 65 && _cint <= 90) ||
      (_cint >= 97 && _cint <= 122)
    ) {
      return State(false, s7);
    }
    if (_cint == 46) {
      return State(false, s8);
    }

    return State(false, s0);
  }

  function s8(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (_cint == 45 || (_cint >= 48 && _cint <= 57)) {
      return State(false, s5);
    }
    if ((_cint >= 65 && _cint <= 90) || (_cint >= 97 && _cint <= 122)) {
      return State(false, s6);
    }

    return State(false, s0);
  }

  function s9(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (_cint == 45 || (_cint >= 48 && _cint <= 57)) {
      return State(false, s7);
    }
    if (_cint == 46) {
      return State(false, s8);
    }
    if ((_cint >= 65 && _cint <= 90) || (_cint >= 97 && _cint <= 122)) {
      return State(true, s10);
    }

    return State(false, s0);
  }

  function s10(bytes1 c) internal pure returns (State memory) {
    uint8 _cint = uint8(c);
    if (_cint == 45 || (_cint >= 48 && _cint <= 57)) {
      return State(false, s7);
    }
    if (_cint == 46) {
      return State(false, s8);
    }
    if ((_cint >= 65 && _cint <= 90) || (_cint >= 97 && _cint <= 122)) {
      return State(true, s10);
    }

    return State(false, s0);
  }

  function matches(string memory input) public pure returns (bool) {
    State memory cur = State(false, s1);

    for (uint256 i = 0; i < bytes(input).length; i++) {
      bytes1 c = bytes(input)[i];

      cur = cur.func(c);
    }

    return cur.accepts;
  }
}
