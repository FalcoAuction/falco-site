-- The pilot worklist (/crm/leads/pilot) lists staging rows by the route on
-- their shared review card (raw_payload->'pilot_review'->>'route'). Without
-- an index that filter scans 61k wide rows and risks the 8s API timeout.
-- Partial: only rows that carry a card are indexed.

CREATE INDEX IF NOT EXISTS homeowner_requests_staging_pilot_route
  ON public.homeowner_requests_staging ((raw_payload -> 'pilot_review' ->> 'route'))
  WHERE (raw_payload -> 'pilot_review') IS NOT NULL;
