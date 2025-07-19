WITH space_created AS (SELECT substring(topic3 FROM 13) AS space_address
                       FROM base.logs
                       WHERE
                         -- SpaceFactory
                           contract_address = 0x9978c826d93883701522d2CA645d5436e5654252
                         -- SpaceCreated(address,uint256,address)
                         AND topic0 = 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b
                         AND block_time > cast('2024-05-01' AS timestamp)),
     subscription_tx AS (SELECT DISTINCT l.contract_address AS space_address,
                                         l.tx_hash
                         FROM base.logs l
                                  JOIN space_created sc
                                       ON l.contract_address = sc.space_address
                         WHERE
                           -- SubscriptionUpdate(uint256,uint64)
                             l.topic0 = 0x2ec2be2c4b90c2cf13ecb6751a24daed6bb741ae5ed3f7371aabf9402f6d62e8
                           AND l.block_time > cast('2024-05-01' AS timestamp)),
     summary_payments AS (SELECT date_trunc('day', t.block_time) AS day, SUM (t.value) / 1e18 AS gross_revenue
FROM base.traces t
    JOIN subscription_tx st
ON t.tx_hash = st.tx_hash
    AND t.to = st.space_address
WHERE
    t.success
  AND t.call_type = 'call'
  AND t.value
    > 0
  AND t.block_time
    > cast ('2024-05-01' AS timestamp)
GROUP BY 1
    ),
    summary_refunds AS (
SELECT
    date_trunc('day', t.block_time) AS day, SUM (t.value) / 1e18 AS total_refunds
FROM base.traces t
    JOIN subscription_tx st
ON t.tx_hash = st.tx_hash
    AND t."from" = st.space_address
WHERE
    t.success
  AND t.call_type = 'call'
  AND t.value
    > 0
-- exclude protocol fees
  AND t.to != 0x562aa63a64f56245af69b86b4e4be34421f84c81
-- exclude self transfers
  AND t.to != t."from"
  AND t.block_time
    > cast ('2024-05-01' AS timestamp)
GROUP BY 1
    ),
    -- Track protocol fees from membership transactions only
    summary_protocol_fees AS (
SELECT
    date_trunc('day', t.block_time) AS day, SUM (t.value) / 1e18 AS protocol_revenue
FROM base.traces t
    JOIN subscription_tx st
ON t.tx_hash = st.tx_hash
    AND t."from" = st.space_address
WHERE
    t.to = 0x562aa63a64f56245af69b86b4e4be34421f84c81
  AND t.success
  AND t.call_type = 'call'
  AND t.value
    > 0
  AND t.block_time
    > cast ('2024-05-01' AS timestamp)
GROUP BY 1
    ),
    days AS (
SELECT CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2024-05-30'), CURRENT_DATE, INTERVAL '1' day
    )
    ) AS t(day)
    )
SELECT d.day,
       (COALESCE(sp.gross_revenue, 0)
           - COALESCE(sr.total_refunds, 0)) AS gross_revenue,
       COALESCE(spf.protocol_revenue, 0)    AS protocol_revenue,
       SUM(
               COALESCE(sp.gross_revenue, 0)
                   - COALESCE(sr.total_refunds, 0)
       )                                       OVER (ORDER BY d.day)                 AS total_gross_revenue, SUM(COALESCE(spf.protocol_revenue, 0)) OVER (ORDER BY d.day)                 AS total_protocol_revenue
FROM days d
         LEFT JOIN summary_payments sp
                   ON d.day = sp.day
         LEFT JOIN summary_refunds sr
                   ON d.day = sr.day
         LEFT JOIN summary_protocol_fees spf
                   ON d.day = spf.day
ORDER BY d.day DESC;
