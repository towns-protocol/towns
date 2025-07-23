-- Wallet membership analysis using materialized tables
WITH membership_mints AS (SELECT member_address,
                                 town_address,
                                 token_id
                          FROM dune.towns_protocol.result_membership_subscriptions
                          WHERE event_type = 'mint'
                            AND block_time > CAST('2024-05-01' AS timestamp))

SELECT COUNT(*) as num_memberships,
       member_address
FROM membership_mints
WHERE member_address IS NOT NULL
GROUP BY member_address
ORDER BY num_memberships DESC
