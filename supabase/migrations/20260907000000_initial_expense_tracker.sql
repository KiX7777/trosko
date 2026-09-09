-- Troško initial schema. Apply with Supabase CLI when available.
create extension if not exists pgcrypto;

create type public.account_type as enum ('cash', 'current', 'credit_card', 'savings', 'wallet', 'other');
create type public.category_type as enum ('expense', 'income');
create type public.transaction_type as enum ('expense', 'income', 'transfer');
create type public.recurring_frequency as enum ('weekly', 'monthly', 'yearly', 'custom');
create type public.ocr_status as enum ('pending', 'processing', 'needs_review', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  primary_currency text not null default 'EUR' check (char_length(primary_currency) = 3),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'current',
  currency text not null default 'EUR' check (char_length(currency) = 3),
  initial_balance numeric(14, 2) not null default 0,
  balance numeric(14, 2) not null default 0,
  color text not null default '#6bd8cb',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  icon text not null default 'receipt',
  color text not null default '#6bd8cb',
  type public.category_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6bd8cb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type public.category_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  frequency public.recurring_frequency not null,
  interval integer not null default 1 check (interval > 0),
  start_date date not null,
  next_run_at date not null,
  end_date date,
  active boolean not null default true,
  auto_log boolean not null default false,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid,
  file_path text not null,
  mime_type text not null,
  ocr_status public.ocr_status not null default 'pending',
  ocr_data jsonb,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  exchange_rate numeric(18, 8) not null default 1,
  amount_base numeric(14, 2) not null,
  description text not null,
  merchant text,
  transaction_date date not null,
  notes text,
  recurring_transaction_id uuid references public.recurring_transactions(id) on delete set null,
  transfer_group_id uuid,
  receipt_id uuid references public.receipts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.receipts
  add constraint receipts_transaction_id_fkey foreign key (transaction_id) references public.transactions(id) on delete set null;

create table public.transaction_labels (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (transaction_id, label_id)
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  page text not null default 'transactions',
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts(user_id);
create index categories_user_id_idx on public.categories(user_id);
create index labels_user_id_idx on public.labels(user_id);
create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_category_id_idx on public.transactions(category_id);
create index recurring_user_next_run_idx on public.recurring_transactions(user_id, next_run_at) where active = true;
create index receipts_user_created_idx on public.receipts(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.labels enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.receipts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_labels enable row level security;
alter table public.saved_views enable row level security;

revoke all on public.profiles, public.accounts, public.categories, public.labels, public.recurring_transactions, public.receipts, public.transactions, public.transaction_labels, public.saved_views from anon;
grant select, insert, update, delete on public.profiles, public.accounts, public.categories, public.labels, public.recurring_transactions, public.receipts, public.transactions, public.transaction_labels, public.saved_views to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy accounts_select_own on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy accounts_insert_own on public.accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy accounts_update_own on public.accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy accounts_delete_own on public.accounts for delete to authenticated using ((select auth.uid()) = user_id);

create policy categories_select_own on public.categories for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.categories for delete to authenticated using ((select auth.uid()) = user_id);

create policy labels_select_own on public.labels for select to authenticated using ((select auth.uid()) = user_id);
create policy labels_insert_own on public.labels for insert to authenticated with check ((select auth.uid()) = user_id);
create policy labels_update_own on public.labels for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy labels_delete_own on public.labels for delete to authenticated using ((select auth.uid()) = user_id);

create policy recurring_select_own on public.recurring_transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy recurring_insert_own on public.recurring_transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy recurring_update_own on public.recurring_transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy recurring_delete_own on public.recurring_transactions for delete to authenticated using ((select auth.uid()) = user_id);

create policy receipts_select_own on public.receipts for select to authenticated using ((select auth.uid()) = user_id);
create policy receipts_insert_own on public.receipts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy receipts_update_own on public.receipts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy receipts_delete_own on public.receipts for delete to authenticated using ((select auth.uid()) = user_id);

create policy transactions_select_own on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy transactions_insert_own on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy transactions_update_own on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_delete_own on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

create policy transaction_labels_select_own on public.transaction_labels for select to authenticated using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid()))
);
create policy transaction_labels_insert_own on public.transaction_labels for insert to authenticated with check (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid()))
  and exists (select 1 from public.labels l where l.id = label_id and l.user_id = (select auth.uid()))
);
create policy transaction_labels_delete_own on public.transaction_labels for delete to authenticated using (
  exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid()))
);

create policy saved_views_select_own on public.saved_views for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_views_insert_own on public.saved_views for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_views_update_own on public.saved_views for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_views_delete_own on public.saved_views for delete to authenticated using ((select auth.uid()) = user_id);

-- Storage path convention inside the `receipts` bucket: {user_id}/{receipt_id}/receipt.ext
create policy receipts_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy receipts_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy receipts_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text)
) with check (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy receipts_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
