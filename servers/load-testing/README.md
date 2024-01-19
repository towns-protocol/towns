## Introduction

This Dockerfile contains the river load testing leader and follower nodes.

## Environment variables
    - MODE: `leader` or `follower`
    - FOLLOWER_ID: a unique identifier for the follower node. required for follower nodes.
    - LEADER_URL: url of the leader node. required for follower nodes.