-- Delegation Proxies - All proxy contracts deployed by BaseRegistry
-- Maps depositId → proxy_address → owner_wallet
-- Contract: 0x7c0422b31401C936172C897802CF0373B35B7698 (BaseRegistry)
-- Event: DelegationProxyDeployed(uint256,address,address) 0x9cc45a93930c8a80c99a1f194086c25c0e14b43109f4a5adfd9689aaa703ec4c

SELECT bytearray_to_uint256(l.topic1) AS deposit_id,
       substring(l.topic2 FROM 13)    AS initial_delegatee,
       substring(l.data FROM 13)      AS proxy_address,
       se.owner                       AS owner,
       se.amount                      AS stake_amount,
       l.block_time                   AS deployment_time,
       l.block_number,
       l.tx_hash,
       l.index                        AS log_index
FROM base.logs l
         JOIN dune.towns_protocol.result_staking_events se
              ON bytearray_to_uint256(l.topic1) = se.deposit_id
                  AND se.event_type = 'stake'
WHERE l.contract_address = 0x7c0422b31401C936172C897802CF0373B35B7698
  AND l.topic0 = 0x9cc45a93930c8a80c99a1f194086c25c0e14b43109f4a5adfd9689aaa703ec4c -- DelegationProxyDeployed
  AND l.block_time > CAST('2024-12-17' AS timestamp)
ORDER BY l.block_time DESC, l.index DESC;
