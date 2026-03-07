-- Hot-path indexes for user-scoped listings
-- Supports: cards by user ordered by created_at desc, pages by user ordered by name

create index if not exists idx_cards_user_created_at_desc
  on public.cards (user_id, created_at desc);

create index if not exists idx_pages_user_name
  on public.pages (user_id, name);
