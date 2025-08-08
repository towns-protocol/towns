-- Optimized with materialized table
WITH town_subscriptions AS (SELECT DISTINCT ms.town_address,
                                            ms.tx_hash
                            FROM dune.towns_protocol.result_membership_subscriptions ms),

     -- Get actual ETH value for those subscription txs via top-level transactions
     town_payments AS (SELECT t.to AS town_address,
                              t.block_time,
                              t.value
                       FROM base.transactions t
                                JOIN town_subscriptions ts
                                     ON t.hash = ts.tx_hash
                                         AND t.to = ts.town_address
                       WHERE t.success = true
                         AND t.value > 0
                         AND t.block_time > cast('2024-05-01' AS timestamp)),

     -- Aggregate daily
     summary AS (SELECT date_trunc('day', block_time) AS day, SUM (value) / 1e18 AS daily_revenue
FROM town_payments
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
