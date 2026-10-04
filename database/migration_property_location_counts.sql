-- Active-listing counts per state and per city for the search dropdowns.
-- The site used to build these lists by downloading property rows, which the
-- API caps at 1000 rows, so states late in the alphabet (NC, TX, VA...) were
-- missing. Counting in the database avoids the cap.

CREATE OR REPLACE FUNCTION property_state_counts()
RETURNS TABLE (state TEXT, listings BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT upper(trim(p.state)), count(*)
  FROM properties p
  WHERE p.is_active = true AND coalesce(trim(p.state), '') <> ''
  GROUP BY 1
  ORDER BY 1
$$;

CREATE OR REPLACE FUNCTION property_city_counts(p_state TEXT)
RETURNS TABLE (city TEXT, listings BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT trim(p.city), count(*)
  FROM properties p
  WHERE p.is_active = true
    AND upper(trim(p.state)) = upper(trim(p_state))
    AND coalesce(trim(p.city), '') <> ''
  GROUP BY 1
  ORDER BY 1
$$;

GRANT EXECUTE ON FUNCTION property_state_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION property_city_counts(TEXT) TO anon, authenticated;
