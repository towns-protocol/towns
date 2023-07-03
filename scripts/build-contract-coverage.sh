#!/bin/bash

forge coverage --report lcov
# https://github.com/foundry-rs/foundry/issues/2567
lcov --remove lcov.info 'packages/contracts/src/*Service.sol' 'packages/contracts/src/*Storage.sol' 'packages/contracts/test/*' 'packages/contracts/scripts/*' 'packages/contracts/src/governance/*' -o packages/contracts/coverage/lcov.info --rc lcov_branch_coverage=1
rm lcov.info
genhtml packages/contracts/coverage/lcov.info -o packages/contracts/coverage/reports --branch-coverage
