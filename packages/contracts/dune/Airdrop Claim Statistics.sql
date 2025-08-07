-- Airdrop Claims Statistics - Analytics using materialized table
-- Uses dune.towns_protocol.result_airdrop_claims materialized table

WITH hourly_claims AS (
         SELECT DATE_TRUNC('hour', block_time) AS hour,
                claim_type,
                COUNT(*) AS hourly_count,
                SUM(amount) / 1e18 AS hourly_amount,
                (SUM(amount) / 1e18) * COALESCE(towns_price.price, 0) AS hourly_amount_usd
         FROM dune.towns_protocol.result_airdrop_claims
             LEFT JOIN prices.usd_latest towns_price
                 ON towns_price.blockchain = 'ethereum'
                 AND towns_price.contract_address = 0x000000Fa00b200406de700041CFc6b19BbFB4d13
             GROUP BY
                 1,
                 2,
                 towns_price.price
    ),

-- Pivot hourly data by type
    hourly_summary AS (
SELECT
    hour,
    COALESCE(SUM(CASE WHEN claim_type = 'with_penalty' THEN hourly_count END), 0) AS penalty_claims,
    COALESCE(SUM(CASE WHEN claim_type = 'staked' THEN hourly_count END), 0) AS staked_claims,
    COALESCE(SUM(CASE WHEN claim_type = 'with_penalty' THEN hourly_amount END), 0) AS penalty_amount,
    COALESCE(SUM(CASE WHEN claim_type = 'staked' THEN hourly_amount END), 0) AS staked_amount,
    COALESCE(SUM(CASE WHEN claim_type = 'with_penalty' THEN hourly_amount_usd END), 0) AS penalty_amount_usd,
    COALESCE(SUM(CASE WHEN claim_type = 'staked' THEN hourly_amount_usd END), 0) AS staked_amount_usd,
    SUM(hourly_count) AS total_hourly_claims,
    SUM(hourly_amount) AS total_hourly_amount,
    SUM(hourly_amount_usd) AS total_hourly_amount_usd
FROM hourly_claims
GROUP BY
    hour
    ),

-- Generate complete date range by hour
    hours AS (
SELECT
    TRY_CAST(hour AS TIMESTAMP) AS hour
FROM UNNEST(SEQUENCE (
    TRY_CAST('2025-08-05 12:00:00' AS TIMESTAMP), CAST (CURRENT_TIMESTAMP AS TIMESTAMP), INTERVAL '1' hour
    )) AS t(hour)
    )
SELECT h.hour,
       COALESCE(hs.penalty_claims, 0)         AS penalty_claims,
       COALESCE(hs.staked_claims, 0)          AS staked_claims,
       COALESCE(hs.penalty_amount, 0)         AS penalty_amount,
       COALESCE(hs.staked_amount, 0)          AS staked_amount,
       COALESCE(hs.penalty_amount_usd, 0)     AS penalty_amount_usd,
       COALESCE(hs.staked_amount_usd, 0)      AS staked_amount_usd,
       COALESCE(hs.total_hourly_claims, 0)    AS total_hourly_claims,
       COALESCE(hs.total_hourly_amount, 0)    AS total_hourly_amount,
       COALESCE(hs.total_hourly_amount_usd, 0) AS total_hourly_amount_usd,
       -- Cumulative totals
       SUM(COALESCE(hs.penalty_claims, 0)) OVER (ORDER BY h.hour) AS cumulative_penalty_claims,
       SUM(COALESCE(hs.staked_claims, 0)) OVER (ORDER BY h.hour) AS cumulative_staked_claims,
       SUM(COALESCE(hs.penalty_amount, 0)) OVER (ORDER BY h.hour) AS cumulative_penalty_amount,
       SUM(COALESCE(hs.staked_amount, 0)) OVER (ORDER BY h.hour) AS cumulative_staked_amount,
       SUM(COALESCE(hs.penalty_amount_usd, 0)) OVER (ORDER BY h.hour) AS cumulative_penalty_amount_usd,
       SUM(COALESCE(hs.staked_amount_usd, 0)) OVER (ORDER BY h.hour) AS cumulative_staked_amount_usd,
       SUM(COALESCE(hs.total_hourly_claims, 0)) OVER (ORDER BY h.hour) AS cumulative_total_claims,
       SUM(COALESCE(hs.total_hourly_amount, 0)) OVER (ORDER BY h.hour) AS cumulative_total_amount,
       SUM(COALESCE(hs.total_hourly_amount_usd, 0)) OVER (ORDER BY h.hour) AS cumulative_total_amount_usd
FROM hours AS h
         LEFT JOIN hourly_summary AS hs
                   ON h.hour = hs.hour
ORDER BY h.hour DESC
