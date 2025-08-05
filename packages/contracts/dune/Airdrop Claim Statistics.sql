-- Airdrop Claims Statistics - Analytics using materialized table
-- Uses dune.towns_protocol.result_airdrop_claims materialized table

WITH claim_data AS (SELECT *
                    FROM dune.towns_protocol.result_airdrop_claims),

-- Total claims overview
     total_stats AS (SELECT COUNT(*)                AS total_claims,
                            SUM(amount) / 1e18      AS total_amount_claimed,
                            COUNT(DISTINCT account) AS unique_accounts
                     FROM claim_data),

-- Claims by type breakdown
     type_breakdown AS (SELECT claim_type,
                               COUNT(*)                AS claim_count,
                               SUM(amount) / 1e18      AS total_amount,
                               COUNT(DISTINCT account) AS unique_accounts
                        FROM claim_data
                        GROUP BY claim_type),

-- Daily aggregations
     daily_claims
         AS (SELECT DATE_TRUNC('day', block_time) AS day, claim_type, COUNT (*) AS daily_count, SUM (amount) / 1e18 AS daily_amount
FROM claim_data
GROUP BY 1, 2
    ),

-- Pivot daily data by type
    daily_summary AS (
SELECT
    day, COALESCE (SUM (CASE WHEN claim_type = 'with_penalty' THEN daily_count END), 0) AS penalty_claims, COALESCE (SUM (CASE WHEN claim_type = 'staked' THEN daily_count END), 0) AS staked_claims, COALESCE (SUM (CASE WHEN claim_type = 'with_penalty' THEN daily_amount END), 0) AS penalty_amount, COALESCE (SUM (CASE WHEN claim_type = 'staked' THEN daily_amount END), 0) AS staked_amount, SUM (daily_count) AS total_daily_claims, SUM (daily_amount) AS total_daily_amount
FROM daily_claims
GROUP BY day
    ),

-- Generate complete date range
    days AS (
SELECT CAST (day AS timestamp) AS day
FROM unnest(
    sequence (
    DATE ('2025-07-15'), CURRENT_DATE, INTERVAL '1' day
    )
    ) AS t(day)
    )

-- Final output with cumulative totals
SELECT d.day,
       COALESCE(ds.penalty_claims, 0)     AS penalty_claims,
       COALESCE(ds.staked_claims, 0)      AS staked_claims,
       COALESCE(ds.penalty_amount, 0)     AS penalty_amount,
       COALESCE(ds.staked_amount, 0)      AS staked_amount,
       COALESCE(ds.total_daily_claims, 0) AS total_daily_claims,
       COALESCE(ds.total_daily_amount, 0) AS total_daily_amount,

       -- Cumulative totals
       SUM(COALESCE(ds.penalty_claims, 0))   OVER (ORDER BY d.day) AS cumulative_penalty_claims, SUM(COALESCE(ds.staked_claims, 0)) OVER (ORDER BY d.day) AS cumulative_staked_claims, SUM(COALESCE(ds.penalty_amount, 0)) OVER (ORDER BY d.day) AS cumulative_penalty_amount, SUM(COALESCE(ds.staked_amount, 0)) OVER (ORDER BY d.day) AS cumulative_staked_amount, SUM(COALESCE(ds.total_daily_claims, 0)) OVER (ORDER BY d.day) AS cumulative_total_claims, SUM(COALESCE(ds.total_daily_amount, 0)) OVER (ORDER BY d.day) AS cumulative_total_amount

FROM days d
         LEFT JOIN daily_summary ds ON d.day = ds.day
ORDER BY d.day DESC;
