---
name: create-migration
description: Criar nova migração Supabase com RLS obrigatório e policy por auth.uid(). Use sempre que for adicionar ou modificar tabelas no banco.
---

## Checklist para toda migração

### 1. Nomenclatura do arquivo
```
supabase/migrations/YYYYMMDDHHMMSS_descricao_curta.sql
```

### 2. Estrutura obrigatória para toda nova tabela

```sql
-- Criar tabela
CREATE TABLE IF NOT EXISTS nome_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- ... outros campos ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS obrigatório (regra #5 do CLAUDE.md)
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

-- Policy de SELECT
CREATE POLICY "dono_select" ON nome_tabela
  FOR SELECT USING (dono_uid = auth.uid());

-- Policy de INSERT
CREATE POLICY "dono_insert" ON nome_tabela
  FOR INSERT WITH CHECK (dono_uid = auth.uid());

-- Policy de UPDATE
CREATE POLICY "dono_update" ON nome_tabela
  FOR UPDATE USING (dono_uid = auth.uid());

-- Policy de DELETE
CREATE POLICY "dono_delete" ON nome_tabela
  FOR DELETE USING (dono_uid = auth.uid());
```

### 3. Tipos obrigatórios por campo

| Dado | Tipo correto |
|------|-------------|
| Valores monetários | `BIGINT` (centavos, nunca DECIMAL/FLOAT) |
| Status lançamento | `TEXT CHECK (status IN ('previsto', 'realizado'))` |
| Escopo | `TEXT CHECK (escopo IN ('pj', 'pf'))` |
| Datas | `DATE` ou `TIMESTAMPTZ` (armazenar UTC) |
| Percentuais | `NUMERIC(5,2)` |

### 4. Verificações antes de aplicar
- [ ] Toda tabela com `dono_uid` tem RLS habilitado?
- [ ] Todas as 4 policies (SELECT/INSERT/UPDATE/DELETE) criadas?
- [ ] Nenhuma policy usa `USING (true)` (acesso público proibido)?
- [ ] Valores monetários como BIGINT?
- [ ] CHECKs em campos de status e escopo?

### 5. Nunca fazer
- `ALTER TABLE x DISABLE ROW LEVEL SECURITY`
- Policy sem filtro por `auth.uid()`
- Coluna de valor como `FLOAT` ou `DECIMAL` sem centavos
- Dados PJ e PF na mesma tabela sem campo `escopo`
