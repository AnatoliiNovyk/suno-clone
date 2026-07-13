-- Migration: remove_merchants
-- Created at: 1784064000
--
-- Completely removes the merchant feature (registration, KYC documents,
-- provider accounts) from the database. Idempotent — safe to re-run.
-- Run this in the Dashboard SQL Editor of the live project.

-- 1. Storage: merchant-docs bucket policies, files, and the bucket itself.
DROP POLICY IF EXISTS "merchant_docs_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "merchant_docs_owner_select" ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'merchant-docs';
DELETE FROM storage.buckets WHERE id = 'merchant-docs';

-- 2. Tables (CASCADE drops their policies and FKs).
DROP TABLE IF EXISTS merchant_provider_accounts CASCADE;
DROP TABLE IF EXISTS merchant_documents CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;

-- 3. Subscriptions: drop the merchant reference column.
ALTER TABLE subscriptions DROP COLUMN IF EXISTS merchant_id;

-- Note: is_admin() and profiles.role are intentionally kept — they are
-- generic admin infrastructure, not merchant-specific.
