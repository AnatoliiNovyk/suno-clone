-- Migration: remove_merchants
-- Created at: 1784064000
--
-- Completely removes the merchant feature (registration, KYC documents,
-- provider accounts) from the database. Idempotent — safe to re-run.
-- Run this in the Dashboard SQL Editor of the live project.

-- 1. Storage: drop the merchant-docs policies. The bucket itself CANNOT be
--    removed via SQL — Supabase blocks direct deletes from storage tables
--    (storage.protect_delete trigger). Delete it in Dashboard → Storage →
--    merchant-docs → Delete bucket (removes its files too).
DROP POLICY IF EXISTS "merchant_docs_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "merchant_docs_owner_select" ON storage.objects;

-- 2. Tables (CASCADE drops their policies and FKs).
DROP TABLE IF EXISTS merchant_provider_accounts CASCADE;
DROP TABLE IF EXISTS merchant_documents CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;

-- 3. Subscriptions: drop the merchant reference column.
ALTER TABLE subscriptions DROP COLUMN IF EXISTS merchant_id;

-- Note: is_admin() and profiles.role are intentionally kept — they are
-- generic admin infrastructure, not merchant-specific.
