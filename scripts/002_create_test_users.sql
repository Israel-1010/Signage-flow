-- Script para criar usuários de teste com diferentes roles
-- Este script deve ser executado como admin do Supabase

-- 1. Atualizar usuário demo para admin (se existir)
UPDATE public.profiles 
SET role = 'admin' 
WHERE display_name LIKE '%demo%' OR id IN (
  SELECT id FROM auth.users WHERE email LIKE '%demo%'
);

-- 2. Criar usuários de teste
-- Nota: Em produção, use a API de Auth do Supabase ao invés de INSERT direto

-- Usuário teste_admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste.admin@example.com',
  crypt('teste123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"display_name":"Teste Admin"}'
) ON CONFLICT DO NOTHING;

-- Usuário teste_user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste.user@example.com',
  crypt('teste123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"display_name":"Teste User"}'
) ON CONFLICT DO NOTHING;

-- Usuário teste_viewer
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste.viewer@example.com',
  crypt('teste123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"display_name":"Teste Viewer"}'
) ON CONFLICT DO NOTHING;

-- 3. Atualizar os perfis com os roles corretos
UPDATE public.profiles 
SET role = 'admin' 
WHERE display_name = 'Teste Admin';

UPDATE public.profiles 
SET role = 'user' 
WHERE display_name = 'Teste User';

UPDATE public.profiles 
SET role = 'viewer' 
WHERE display_name = 'Teste Viewer';

-- Confirmação
SELECT u.email, p.role FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id 
WHERE u.email LIKE 'teste%' OR u.email LIKE '%demo%'
ORDER BY u.created_at DESC;
