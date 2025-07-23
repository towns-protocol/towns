-- First 10 Membership Mints with ETH Payment (May-June 2024)
WITH mint_events_with_payments AS (SELECT ms.block_time,
                                          ms.town_address,
                                          ms.member_address,
                                          ms.token_id,
                                          ms.tx_hash,
                                          t.value / 1e18 AS payment_amount
                                   FROM dune.towns_protocol.result_membership_subscriptions ms
                                            JOIN base.traces t
                                                 ON ms.tx_hash = t.tx_hash
                                                     AND ms.town_address = t.to
                                                     AND t.success = true
                                                     AND t.call_type = 'call'
                                                     AND t.value > 0
                                   WHERE ms.event_type = 'mint'
                                     AND ms.block_time >= CAST('2024-05-01' AS timestamp)
                                     AND ms.block_time < CAST('2024-07-01' AS timestamp) -- May-June only
                                     AND t.block_time >= CAST('2024-05-01' AS timestamp)
                                     AND t.block_time < CAST('2024-07-01' AS timestamp))

SELECT block_time,
       town_address,
       member_address,
       token_id,
       tx_hash,
       payment_amount
FROM mint_events_with_payments
ORDER BY block_time ASC, town_address ASC LIMIT 10;
