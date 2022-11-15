#!/bin/bash

forge coverage --report lcov
lcov --remove lcov.info  -o contracts/docs/coverage/lcov.info '**/**/test/**' '**/**/scripts/**.sol' --rc lcov_branch_coverage=1
rm lcov.info
genhtml contracts/docs/coverage/lcov.info -o contracts/docs/coverage/reports --branch-coverage
