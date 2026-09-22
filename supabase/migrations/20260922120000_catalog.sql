-- Enough catalog for the real-value Supabase project.
-- The app reads data/seed until this migration is applied and npm run load-seed runs.
-- No auth. anon and authenticated can read. They cannot write.

create table public.products (
  sku_id text primary key,
  name text not null,
  brand text not null,
  asin text,
  bestbuy_sku text
);

create table public.product_attributes (
  id bigint generated always as identity primary key,
  sku_id text not null references public.products (sku_id) on delete cascade,
  attr_key text not null,
  value jsonb not null,
  source text not null,
  as_of date not null,
  constraint product_attributes_key_check check (
    attr_key in (
      'anc',
      'battery_hours',
      'weight_g',
      'bluetooth',
      'wired_3_5mm',
      'call_mic',
      'warranty_years',
      'foldable',
      'anc_quality_cite_url',
      'anc_quality_note'
    )
  ),
  constraint product_attributes_sku_attr unique (sku_id, attr_key)
);

create table public.prices (
  sku_id text primary key references public.products (sku_id) on delete cascade,
  street_price_usd numeric(10, 2) not null check (street_price_usd >= 0),
  source text not null,
  as_of date not null
);

create table public.job_presets (
  id text primary key,
  name text not null,
  required jsonb not null,
  soft jsonb not null,
  default_max_usd numeric(10, 2)
);

create index product_attributes_sku_id_idx
  on public.product_attributes (sku_id);

revoke all on public.products from anon, authenticated;
revoke all on public.product_attributes from anon, authenticated;
revoke all on public.prices from anon, authenticated;
revoke all on public.job_presets from anon, authenticated;

grant select on public.products to anon, authenticated;
grant select on public.product_attributes to anon, authenticated;
grant select on public.prices to anon, authenticated;
grant select on public.job_presets to anon, authenticated;

alter table public.products enable row level security;
alter table public.product_attributes enable row level security;
alter table public.prices enable row level security;
alter table public.job_presets enable row level security;

create policy "products are public read"
  on public.products for select to anon, authenticated using (true);

create policy "attributes are public read"
  on public.product_attributes for select to anon, authenticated using (true);

create policy "prices are public read"
  on public.prices for select to anon, authenticated using (true);

create policy "job presets are public read"
  on public.job_presets for select to anon, authenticated using (true);
