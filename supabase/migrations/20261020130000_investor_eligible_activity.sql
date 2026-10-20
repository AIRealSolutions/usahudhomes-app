-- Log an 'investor_eligible' activity event when a listing opens to investor bids:
-- its bidder_types newly include "Investor" (HUD moved it from the owner-occupant
-- Exclusive period to Extended). Feeds the dashboard Market News alert.
-- Applied to production 2026-10-20.
alter table public.property_activity drop constraint if exists property_activity_event_check;
alter table public.property_activity add constraint property_activity_event_check
  check (event in ('listed', 'price_change', 'status_change', 'under_contract', 'back_on_market', 'investor_eligible'));

create or replace function public.log_property_activity() returns trigger
language plpgsql as $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'listed', NEW.price, NEW.status);
    RETURN NEW;
  END IF;

  IF NEW.price IS DISTINCT FROM OLD.price AND NEW.price IS NOT NULL AND OLD.price IS NOT NULL THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, previous_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'price_change', NEW.price, OLD.price, NEW.status);
  END IF;

  IF coalesce(OLD.is_active, false) AND NOT coalesce(NEW.is_active, false) AND upper(coalesce(NEW.status, '')) = 'UNDER CONTRACT' THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'under_contract', NEW.price, NEW.status);
  ELSIF NOT coalesce(OLD.is_active, false) AND coalesce(NEW.is_active, false) THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'back_on_market', NEW.price, NEW.status);
    -- An accepted offer still open (or presumed closed) when the home is relisted fell through
    UPDATE accepted_offers SET outcome = 'fell_through', updated_at = now()
      WHERE case_number = NEW.case_number AND outcome IN ('pending', 'likely_closed');
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND coalesce(NEW.is_active, false) THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'status_change', NEW.price, NEW.status);
  END IF;

  -- Opened to investor bids (Exclusive -> Extended)
  IF coalesce(NEW.is_active, false)
     AND coalesce(NEW.bidder_types, '') ILIKE '%investor%'
     AND coalesce(OLD.bidder_types, '') NOT ILIKE '%investor%' THEN
    INSERT INTO property_activity (case_number, property_id, state, event, list_price, status)
    VALUES (NEW.case_number, NEW.id, NEW.state, 'investor_eligible', NEW.price, NEW.status);
  END IF;
  RETURN NEW;
END
$$;

drop trigger if exists trg_property_activity on public.properties;
create trigger trg_property_activity after insert or update of price, status, is_active, bidder_types on public.properties
  for each row execute function public.log_property_activity();
