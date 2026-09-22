-- Catalog shape for Enough. The app runs from data/catalog.ts without this
-- database. Apply later to a Real Value Supabase project when one exists.
-- Public read only. No auth in the MVP, and no write policy for anon.

create table public.products (
  id text primary key,
  brand text not null,
  name text not null,
  form text not null default 'over-ear',
  created_at timestamptz not null default now()
);

create table public.product_attributes (
  id bigint generated always as identity primary key,
  product_id text not null references public.products (id) on delete cascade,
  key text not null,
  value jsonb not null,
  source text not null,
  as_of date not null,
  constraint product_attributes_key_check check (
    key in (
      'anc',
      'battery_hours',
      'weight_g',
      'bluetooth',
      'wired_3_5mm',
      'call_mic',
      'warranty_years',
      'foldable',
      'codecs',
      'multipoint'
    )
  ),
  constraint product_attributes_product_key unique (product_id, key)
);

create table public.prices (
  id bigint generated always as identity primary key,
  product_id text not null references public.products (id) on delete cascade,
  retailer text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  source text not null,
  as_of date not null
);

create index product_attributes_product_id_idx
  on public.product_attributes (product_id);

create index prices_product_id_amount_idx
  on public.prices (product_id, amount_cents);

revoke all on public.products from anon, authenticated;
revoke all on public.product_attributes from anon, authenticated;
revoke all on public.prices from anon, authenticated;

grant select on public.products to anon, authenticated;
grant select on public.product_attributes to anon, authenticated;
grant select on public.prices to anon, authenticated;

alter table public.products enable row level security;
alter table public.product_attributes enable row level security;
alter table public.prices enable row level security;

create policy "catalog is public read"
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy "attributes are public read"
  on public.product_attributes
  for select
  to anon, authenticated
  using (true);

create policy "prices are public read"
  on public.prices
  for select
  to anon, authenticated
  using (true);
