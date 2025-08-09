-- Stakes by Wallet - Accurate individual wallet staking positions
-- Uses proxy balances and delegations instead of aggregate voting power
-- Shows actual TOWNS token balances in delegation proxies

WITH wallet_proxy_stakes AS (SELECT dp.owner,
                                    dp.proxy_address,
                                    dp.deposit_id,
                                    pb.current_balance,
                                    pd.to_delegate AS current_delegatee,
                                    pd.status,
                                    CASE
                                        WHEN pd.status = 'delegated'
                                            THEN pb.current_balance
                                        ELSE 0
                                        END        AS active_delegated_balance,
                                    dp.deployment_time
                             FROM dune.towns_protocol.result_delegation_proxies dp
                                      LEFT JOIN dune.towns_protocol.result_proxy_balances pb
                                                ON dp.proxy_address = pb.proxy_address
                                      LEFT JOIN dune.towns_protocol.result_proxy_delegations pd
                                                ON dp.proxy_address = pd.proxy_address),

     wallet_aggregates AS (SELECT owner,
                                  COUNT(DISTINCT proxy_address)                     AS total_proxies,
                                  SUM(COALESCE(current_balance, 0)) / 1e18          AS total_balance,
                                  SUM(COALESCE(active_delegated_balance, 0)) / 1e18 AS total_delegated,
                                  COUNT(DISTINCT current_delegatee)                 AS unique_delegates
                           FROM wallet_proxy_stakes
                           WHERE current_balance > 0
                           GROUP BY owner)

SELECT wa.owner,
       ROUND(wa.total_balance, 2)                            AS total_balance,
       ROUND(wa.total_delegated, 2)                          AS total_delegated,
       wa.total_proxies,
       wa.unique_delegates,
       ROUND(wa.total_delegated / wa.total_balance * 100, 1) AS delegation_ratio_percent,
       RANK()                                                   OVER (ORDER BY wa.total_delegated DESC) AS rank_by_delegated_amount
FROM wallet_aggregates wa
ORDER BY wa.total_delegated DESC;
