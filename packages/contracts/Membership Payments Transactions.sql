with space_created AS (SELECT substring(topic3 from 13) AS space_address
                       FROM base.logs
                       WHERE
                         -- SpaceFactory
                           contract_address = 0x9978c826d93883701522d2CA645d5436e5654252
                         -- SpaceCreated(address,uint256,address)
                         AND topic0 = 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b
                         AND block_time > cast('2024-05-01' AS timestamp)),
     spaces AS (SELECT DISTINCT space_address
                FROM space_created),

     -- All SubscriptionUpdate events (mint or renew)
     subscription_events AS (SELECT DISTINCT contract_address AS space_address,
                                             tx_hash
                             FROM base.logs
                             WHERE
                               -- SubscriptionUpdate(uint256,uint64)
                                 topic0 = 0x2ec2be2c4b90c2cf13ecb6751a24daed6bb741ae5ed3f7371aabf9402f6d62e8
                               AND block_time > cast('2024-05-01' AS timestamp)),

     -- Only spaces we care about plus their subscription tx hashes
     space_subscriptions AS (SELECT ss.space_address,
                                    se.tx_hash
                             FROM spaces ss
                                      JOIN subscription_events se
                                           ON ss.space_address = se.space_address),

     -- Get actual ETH value for those subscription txs via top-level transactions
     space_payments AS (SELECT t.to AS space_address,
                               t.block_time,
                               t.value
                        FROM base.transactions t
                                 JOIN space_subscriptions ss
                                      ON t.hash = ss.tx_hash
                                          AND t.to = ss.space_address
                        WHERE t.success = true
                          AND t.value > 0
                          AND t.block_time > cast('2024-05-01' AS timestamp)),

     -- Aggregate daily
     summary AS (SELECT date_trunc('day', block_time) AS day, SUM (value) / 1e18 AS daily_revenue
FROM space_payments
GROUP BY 1
    ),

-- Complete calendar
    days AS (
SELECT
    CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2024-05-30'), cast (now() as date), INTERVAL '1' day
    )
    ) AS t(day)
    )

SELECT d.day,
       COALESCE(s.daily_revenue, 0) AS daily_revenue,
       SUM(COALESCE(s.daily_revenue, 0))
                                       OVER (ORDER BY d.day)     AS total_revenue
FROM days d
         LEFT JOIN summary s
                   ON d.day = s.day
ORDER BY d.day DESC;
