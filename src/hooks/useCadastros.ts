import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { CadastroFornecedor, CadastroMaterial, CadastroPrestador } from '@/types'

export function useCadastros() {
  const { user } = useAuth()
  const [fornecedores, setFornecedores] = useState<CadastroFornecedor[]>([])
  const [materiais, setMateriais] = useState<CadastroMaterial[]>([])
  const [prestadores, setPrestadores] = useState<CadastroPrestador[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const [fRes, mRes, pRes] = await Promise.all([
      db.from('cadastro_fornecedores').select('*').eq('user_id', user.id).order('nome'),
      db.from('cadastro_materiais').select('*').eq('user_id', user.id).order('descricao'),
      db.from('cadastro_prestadores').select('*').eq('user_id', user.id).order('nome'),
    ])
    if (fRes.data) setFornecedores(fRes.data as CadastroFornecedor[])
    if (mRes.data) setMateriais(mRes.data as CadastroMaterial[])
    if (pRes.data) setPrestadores(pRes.data as CadastroPrestador[])
    setLoading(false)
  }, [user])

  useEffect(() => { reload() }, [reload])

  async function addFornecedor(nome: string) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('cadastro_fornecedores').insert({ user_id: user.id, nome, categoria: 'ambos' })
    await reload()
  }

  async function addMaterial(descricao: string, unidade = 'un') {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('cadastro_materiais').insert({ user_id: user.id, descricao, unidade, categoria: 'outros' })
    await reload()
  }

  return { fornecedores, materiais, prestadores, loading, reload, addFornecedor, addMaterial }
}
