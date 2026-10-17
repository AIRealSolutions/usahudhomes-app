-- Bid statistics for a state's HUD homes, built from accepted_offers.
-- Shown to signed-in buyers on /hud-homes/:state so they can judge what bid HUD tends to accept.
-- SECURITY INVOKER: accepted_offers RLS still applies, so visitors who are not signed in get zeros.
--
--   pct   net to HUD / list price at acceptance (ratios outside 20%–200% are treated as bad data)
--   days  accepted_at minus properties.listing_date. listing_date is when our HUD sync first saw
--         the home, not HUD's own list date, so this is a minimum time on market.
-- Pass NULL for nationwide figures.

CREATE OR REPLACE FUNCTION public.state_offer_stats(p_state TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH o AS (
    SELECT
      a.net_to_hud,
      a.outcome,
      a.accepted_at,
      CASE WHEN a.purchaser_type IN ('Owner-Occupant', 'Investor') THEN a.purchaser_type ELSE 'Other' END AS buyer,
      CASE WHEN a.list_price_at_acceptance > 0
            AND a.net_to_hud / a.list_price_at_acceptance BETWEEN 0.2 AND 2
           THEN a.net_to_hud / a.list_price_at_acceptance END AS pct,
      CASE WHEN p.listing_date <= a.accepted_at
           THEN a.accepted_at::date - p.listing_date::date END AS days
    FROM accepted_offers a
    LEFT JOIN properties p ON p.case_number = a.case_number
    WHERE a.net_to_hud > 0
      AND (p_state IS NULL OR a.state = upper(p_state))
  ),
  o2 AS (
    SELECT o.*,
      CASE WHEN days IS NULL THEN NULL
           WHEN days <= 14 THEN 1 WHEN days <= 30 THEN 2 WHEN days <= 60 THEN 3 ELSE 4 END AS age_band,
      CASE WHEN pct IS NULL THEN NULL
           WHEN pct < 0.70 THEN 1 WHEN pct < 0.80 THEN 2 WHEN pct < 0.90 THEN 3
           WHEN pct < 1.00 THEN 4 ELSE 5 END AS pct_band
    FROM o
  )
  SELECT jsonb_build_object(
    'offers',        count(*),
    'priced',        count(pct),
    'timed',         count(days),
    'fell_through',  count(*) FILTER (WHERE outcome = 'fell_through'),
    'first_at',      min(accepted_at),
    'last_at',       max(accepted_at),
    'pct',  jsonb_build_object(
      'p25', percentile_cont(0.25) WITHIN GROUP (ORDER BY pct),
      'p50', percentile_cont(0.50) WITHIN GROUP (ORDER BY pct),
      'p75', percentile_cont(0.75) WITHIN GROUP (ORDER BY pct),
      'avg', avg(pct)),
    'net',  jsonb_build_object(
      'p25', percentile_cont(0.25) WITHIN GROUP (ORDER BY net_to_hud),
      'p50', percentile_cont(0.50) WITHIN GROUP (ORDER BY net_to_hud),
      'p75', percentile_cont(0.75) WITHIN GROUP (ORDER BY net_to_hud)),
    'days', jsonb_build_object(
      'p25', percentile_cont(0.25) WITHIN GROUP (ORDER BY days),
      'p50', percentile_cont(0.50) WITHIN GROUP (ORDER BY days),
      'p75', percentile_cont(0.75) WITHIN GROUP (ORDER BY days)),
    'pct_bands', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('band', b, 'n', n) ORDER BY b), '[]')
      FROM (SELECT pct_band b, count(*) n FROM o2 WHERE pct_band IS NOT NULL GROUP BY 1) x),
    'by_buyer', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'buyer', buyer, 'n', n, 'pct_p25', pct_p25, 'pct_p50', pct_p50, 'pct_p75', pct_p75,
               'days_p50', days_p50) ORDER BY n DESC), '[]')
      FROM (SELECT buyer, count(*) n,
                   percentile_cont(0.25) WITHIN GROUP (ORDER BY pct) pct_p25,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY pct) pct_p50,
                   percentile_cont(0.75) WITHIN GROUP (ORDER BY pct) pct_p75,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY days) days_p50
            FROM o2 GROUP BY 1) x),
    'by_age', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('band', b, 'n', n, 'pct_p50', pct_p50) ORDER BY b), '[]')
      FROM (SELECT age_band b, count(pct) n,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY pct) pct_p50
            FROM o2 WHERE age_band IS NOT NULL GROUP BY 1) x)
  )
  FROM o2;
$$;

REVOKE ALL ON FUNCTION public.state_offer_stats(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.state_offer_stats(TEXT) TO authenticated;
