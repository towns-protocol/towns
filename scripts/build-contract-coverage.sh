#!/bin/bash

forge coverage --report lcov
# https://github.com/foundry-rs/foundry/issues/2567
lcov --remove lcov.info 'contracts/src/*Service.sol' 'contracts/src/*Storage.sol' 'contracts/test/*' 'contracts/scripts/*' 'contracts/src/governance/*' -o contracts/coverage/lcov.info --rc lcov_branch_coverage=1
rm lcov.info
genhtml contracts/coverage/lcov.info -o contracts/coverage/reports --branch-coverage
