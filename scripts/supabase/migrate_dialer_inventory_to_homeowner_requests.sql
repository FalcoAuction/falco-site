-- ============================================================================
-- Migrate the 91-lead dialer inventory snapshot into homeowner_requests
-- ----------------------------------------------------------------------------
-- The dialer's actual lead queue lives in a JSON blob inside
-- partner_access_requests (state_snapshot row). This pulls each lead out and
-- upserts into homeowner_requests so /admin and /dialer share one feed.
--
-- Idempotent. Upserts on pipeline_lead_key (= lead.key).
-- ============================================================================

-- Step 1: explicitly stage the snapshot row to a temp table so
-- jsonb_array_elements doesn't collide with LIMIT.
drop table if exists tmp_snapshot_blob;
create temp table tmp_snapshot_blob as
select notes::jsonb as full_blob
from public.partner_access_requests
where company = '__falco_system_state__'
  and status  = 'state_snapshot'
  and email   = 'state+dialer_inventory@falco.local'
order by created_at desc
limit 1;

-- Step 2: now expand the array — no LIMIT in this query, so all elements come through.
drop table if exists tmp_snapshot_leads;
create temp table tmp_snapshot_leads as
select jsonb_array_elements(full_blob -> 'payload' -> 'leads') as lead
from tmp_snapshot_blob;

-- Sanity check (will appear in CLI output)
select count(*) as total_leads_in_snapshot from tmp_snapshot_leads;

-- Step 3: parse + upsert
with parsed as (
  select
    'bot'::text as source,
    coalesce(nullif(lead->>'key', ''), nullif(lead->>'slug', '')) as pipeline_lead_key,
    nullif(lead->>'ownerName', '') as full_name,
    nullif(lead->>'ownerName', '') as owner_name_records,
    nullif(lead->>'ownerPhonePrimary', '') as phone,
    coalesce(nullif(lead->>'address', ''), '(no address)') as property_address,
    nullif(lead->>'county', '') as county,
    case
      when length(nullif(lead->>'currentSaleDate', '')) >= 10
        then (substring(lead->>'currentSaleDate' for 10))::date
      else null
    end as trustee_sale_date,
    nullif(lead->>'mortgageAmount', '')::numeric::integer as mortgage_balance,
    case
      when lower(coalesce(lead->>'distressType', '')) like '%trustee%' then 'TRUSTEE_NOTICE'
      when lower(coalesce(lead->>'distressType', '')) like '%foreclosure%' then 'TRUSTEE_NOTICE'
      when lower(coalesce(lead->>'distressType', '')) like '%lis_pendens%' then 'LIS_PENDENS'
      when lower(coalesce(lead->>'distressType', '')) like '%lis pendens%' then 'LIS_PENDENS'
      when lower(coalesce(lead->>'distressType', '')) like '%nod%' then 'NOD'
      when lower(coalesce(lead->>'distressType', '')) like '%preforeclosure%' then 'PREFORECLOSURE'
      when lower(coalesce(lead->>'distressType', '')) like '%pre_foreclosure%' then 'PREFORECLOSURE'
      when lower(coalesce(lead->>'distressType', '')) like '%fsbo%' then 'FSBO'
      when lower(coalesce(lead->>'distressType', '')) like '%probate%' then 'PROBATE'
      when lower(coalesce(lead->>'distressType', '')) like '%tax%' then 'TAX_LIEN'
      else upper(left(coalesce(lead->>'distressType', ''), 60))
    end as distress_type,
    nullif(lead->>'avmMid', '')::numeric::integer as property_value,
    case when nullif(lead->>'avmMid', '') is not null then 'ATTOM_AVM' else null end as property_value_source,
    nullif(lead->>'beds', '')::numeric::smallint as beds,
    nullif(lead->>'baths', '')::numeric::real as baths,
    nullif(lead->>'buildingAreaSqft', '')::numeric::integer as sqft,
    nullif(lead->>'yearBuilt', '')::numeric::smallint as year_built,
    case
      when length(nullif(lead->>'lastSaleDate', '')) >= 10
        then (substring(lead->>'lastSaleDate' for 10))::date
      else null
    end as last_sale_date,
    nullif(lead->>'falcoScore', '')::numeric::integer as pipeline_score
  from tmp_snapshot_leads
),
filtered as (
  select * from parsed where pipeline_lead_key is not null
)
insert into public.homeowner_requests (
  source, pipeline_lead_key, full_name, owner_name_records, phone,
  property_address, county, trustee_sale_date, mortgage_balance,
  distress_type, property_value, property_value_source,
  beds, baths, sqft, year_built, last_sale_date, pipeline_score
)
select
  source, pipeline_lead_key, full_name, owner_name_records, phone,
  property_address, county, trustee_sale_date, mortgage_balance,
  distress_type, property_value, property_value_source,
  beds, baths, sqft, year_built, last_sale_date, pipeline_score
from filtered
on conflict (pipeline_lead_key) where pipeline_lead_key is not null do update set
  full_name           = coalesce(excluded.full_name,           homeowner_requests.full_name),
  owner_name_records  = coalesce(excluded.owner_name_records,  homeowner_requests.owner_name_records),
  phone               = coalesce(nullif(excluded.phone, ''),    homeowner_requests.phone),
  property_address    = case when excluded.property_address <> '(no address)' then excluded.property_address else homeowner_requests.property_address end,
  county              = coalesce(excluded.county,              homeowner_requests.county),
  trustee_sale_date   = coalesce(excluded.trustee_sale_date,   homeowner_requests.trustee_sale_date),
  mortgage_balance    = coalesce(excluded.mortgage_balance,    homeowner_requests.mortgage_balance),
  distress_type       = coalesce(excluded.distress_type,       homeowner_requests.distress_type),
  property_value      = coalesce(excluded.property_value,      homeowner_requests.property_value),
  property_value_source = coalesce(excluded.property_value_source, homeowner_requests.property_value_source),
  beds                = coalesce(excluded.beds,                homeowner_requests.beds),
  baths               = coalesce(excluded.baths,               homeowner_requests.baths),
  sqft                = coalesce(excluded.sqft,                homeowner_requests.sqft),
  year_built          = coalesce(excluded.year_built,          homeowner_requests.year_built),
  last_sale_date      = coalesce(excluded.last_sale_date,      homeowner_requests.last_sale_date),
  pipeline_score      = coalesce(excluded.pipeline_score,      homeowner_requests.pipeline_score),
  updated_at          = now();

-- Final count by source
select source, count(*) as count, count(property_value) as with_avm
from public.homeowner_requests
group by source
order by source;
