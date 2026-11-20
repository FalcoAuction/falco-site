-- asset_profile pages through staging rows that have a property address and
-- an owner match (raw_payload->'owner_match' or ->'padctn_owner_match'),
-- ordered by id. Without an index the filtered scan hit the 8s statement
-- timeout on 22 of 25 runs. These partial indexes match the query exactly.

CREATE INDEX IF NOT EXISTS homeowner_requests_staging_owner_match_addr
  ON public.homeowner_requests_staging (id)
  WHERE property_address IS NOT NULL AND (raw_payload -> 'owner_match') IS NOT NULL;

CREATE INDEX IF NOT EXISTS homeowner_requests_staging_padctn_match_addr
  ON public.homeowner_requests_staging (id)
  WHERE property_address IS NOT NULL AND (raw_payload -> 'padctn_owner_match') IS NOT NULL;
