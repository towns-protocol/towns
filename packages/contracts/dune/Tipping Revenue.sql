-- Get all spaces created by SpaceFactory
WITH space_created AS (SELECT substring(topic3 FROM 13) AS space_address
                       FROM base.logs
                       WHERE
                         -- SpaceFactory
                           contract_address = 0x9978c826d93883701522d2CA645d5436e5654252
                         -- SpaceCreated(address,uint256,address)
                         AND topic0 = 0xe50fc3942f8a2d7e5a7c8fb9488499eba5255b41e18bc3f1b4791402976d1d0b
                         AND block_time > cast('2024-05-01' AS timestamp)),
     -- Track Tip events and calculate ETH tips
     tip_events AS (SELECT l.block_time,
                           CASE
                               -- When currency is ETH (0xEeeE...), use amount
                               WHEN substring(l.topic2 FROM 13) = 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
                                   THEN bytearray_to_uint256(substring(l.data FROM 65 FOR 32))
                               -- Skip non-ETH tips
                               ELSE 0
                               END AS amount
                    FROM base.logs l
                             JOIN space_created sc
                                  ON l.contract_address = sc.space_address
                    WHERE
                      -- Tip(uint256,address,address,address,uint256,bytes32,bytes32)
                        l.topic0 = 0x854db29cbd1986b670c0d596bf56847152a0d66e5ddef710408c1fa4ada78f2b
                      AND l.block_time > cast('2024-12-01' AS timestamp)),
     -- Get tx_hash from tip events to track protocol fees
     tip_transactions AS (SELECT DISTINCT l.tx_hash,
                                          sc.space_address
                          FROM base.logs l
                                   JOIN space_created sc
                                        ON l.contract_address = sc.space_address
                          WHERE
                            -- Tip(uint256,address,address,address,uint256,bytes32,bytes32)
                              l.topic0 = 0x854db29cbd1986b670c0d596bf56847152a0d66e5ddef710408c1fa4ada78f2b
                            AND l.block_time > cast('2024-12-01' AS timestamp)),
     -- Track protocol fees from tipping transactions only
     tipping_treasury_traces AS (SELECT t.block_time,
                                        t.value
                                 FROM base.traces t
                                          JOIN tip_transactions tt
                                               ON t.tx_hash = tt.tx_hash
                                                   AND t."from" = tt.space_address
                                 WHERE t.to = 0x562aA63A64f56245af69b86B4e4be34421f84c81
                                   AND t.success = true
                                   AND t.call_type = 'call'
                                   AND t.value > 0
                                   AND t.block_time > cast('2024-12-01' AS timestamp)),
     -- Aggregate daily tips in ETH
     summary AS (SELECT date_trunc('day', block_time) AS day, SUM (amount) / 1e18 AS daily_tips
FROM tip_events
WHERE amount > 0
GROUP BY 1
    ),
    -- Aggregate daily protocol fees from tipping
    summary_protocol_fees AS (
SELECT date_trunc('day', block_time) AS day, SUM (value) / 1e18 AS protocol_revenue
FROM tipping_treasury_traces
GROUP BY 1
    ),
    -- Generate complete date range for chart
    days AS (
SELECT
    CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2024-05-30'), current_date, INTERVAL '1' day
    )
    ) AS t(day)
    )
-- Final output: daily and cumulative tipping volume and protocol fees
SELECT d.day,
       COALESCE(s.daily_tips, 0)         AS daily_tips,
       COALESCE(spf.protocol_revenue, 0) AS protocol_revenue,
       SUM(COALESCE(s.daily_tips, 0))       OVER (
    ORDER BY d.day
  )                                      AS total_tips, SUM(COALESCE(spf.protocol_revenue, 0)) OVER (
    ORDER BY d.day
  )                                      AS total_protocol_revenue
FROM days d
         LEFT JOIN summary s
                   ON d.day = s.day
         LEFT JOIN summary_protocol_fees spf
                   ON d.day = spf.day
ORDER BY d.day DESC;
