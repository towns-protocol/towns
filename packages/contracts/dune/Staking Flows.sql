-- Staking Flows - Daily inflows and outflows with redelegation detection
-- Tracks net staking flows by detecting and excluding redelegations

WITH vote_changes AS (
    SELECT
        DATE_TRUNC('day', block_time) AS day,
        tx_hash,
        log_index,
        delegate,
        CAST(new_votes AS int256) - CAST(previous_votes AS int256) AS vote_delta
    FROM dune.towns_protocol.result_delegate_votes_events
    WHERE new_votes != previous_votes
),

-- Identify redelegations using consecutive log_index pattern
redelegation_pairs AS (
    SELECT
        v1.tx_hash,
        v1.day,
        v1.delegate AS from_delegate,
        v2.delegate AS to_delegate,
        ABS(v1.vote_delta) / 1e18 AS redelegation_amount
    FROM vote_changes v1
    INNER JOIN vote_changes v2
        ON v1.tx_hash = v2.tx_hash
        AND v2.log_index = v1.log_index + 1  -- Consecutive events
        AND v1.vote_delta < 0  -- First loses votes
        AND v2.vote_delta > 0  -- Second gains votes
        AND ABS(v1.vote_delta) = v2.vote_delta  -- Equal amounts
),

-- Classify each vote change as redelegation or true flow
classified_changes AS (
    SELECT
        vc.*,
        CASE
            WHEN rp.tx_hash IS NOT NULL THEN 'redelegation'
            WHEN vc.vote_delta > 0 THEN 'inflow'
            WHEN vc.vote_delta < 0 THEN 'outflow'
            ELSE 'no_change'
        END AS flow_type
    FROM vote_changes vc
    LEFT JOIN redelegation_pairs rp
        ON vc.tx_hash = rp.tx_hash
        AND (vc.delegate = rp.from_delegate OR vc.delegate = rp.to_delegate)
),

-- Calculate daily flows by aggregating classified changes
daily_flows AS (
    SELECT
        day,
        SUM(CASE WHEN flow_type = 'inflow' THEN vote_delta / 1e18 END) AS daily_inflow,
        SUM(CASE WHEN flow_type = 'outflow' THEN ABS(vote_delta) / 1e18 END) AS daily_outflow,
        SUM(CASE WHEN flow_type = 'redelegation' AND vote_delta > 0 THEN vote_delta / 1e18 END) AS daily_redelegation_volume
    FROM classified_changes
    GROUP BY day
),

-- Add cumulative totals
flows_with_cumulative AS (
    SELECT
        day,
        daily_inflow,
        daily_outflow,
        daily_inflow - daily_outflow AS daily_net_flow,
        daily_redelegation_volume,
        SUM(daily_inflow - daily_outflow) OVER (ORDER BY day) AS cumulative_net_flow,
        SUM(daily_inflow) OVER (ORDER BY day) AS cumulative_inflow,
        SUM(daily_outflow) OVER (ORDER BY day) AS cumulative_outflow
    FROM daily_flows
)

SELECT day,
       ROUND(daily_inflow, 2) AS daily_inflow_tokens,
       ROUND(daily_outflow, 2) AS daily_outflow_tokens,
       ROUND(daily_net_flow, 2) AS daily_net_flow_tokens,
       ROUND(daily_redelegation_volume, 2) AS daily_redelegation_volume_tokens,
       ROUND(cumulative_inflow, 2) AS cumulative_inflow_tokens,
       ROUND(cumulative_outflow, 2) AS cumulative_outflow_tokens,
       ROUND(cumulative_net_flow, 2) AS cumulative_net_flow_tokens
FROM flows_with_cumulative
ORDER BY day DESC;
