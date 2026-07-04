import { useEffect, useState } from 'react'
import { BookUser, Building2, Package, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CadastroFornecedor, CadastroMaterial, CadastroPrestador, MaterialCategoria, FornecedorCategoria } from '@/types'

const SEED_MATERIAIS: { descricao: string; unidade: string }[] = [
  { descricao: 'Placa em lona com impressão digital e requadro em metalon', unidade: 'm²' },
  { descricao: 'Banheiro químico modelo Standard, com manutenção conforme exigências da CETESB', unidade: 'un.mês' },
  { descricao: 'Locação de vias, calçadas, tanques e lagoas', unidade: 'm²' },
  { descricao: 'Tapume fixo para fechamento de áreas, com portão', unidade: 'm²' },
  { descricao: 'Escavação e carga mecanizada em solo de 2ª categoria, em campo aberto', unidade: 'm³' },
  { descricao: 'Broca em concreto armado diâmetro de 30 cm - completa', unidade: 'm' },
  { descricao: 'Lastro de pedra britada', unidade: 'm³' },
  { descricao: 'Forma em madeira comum para fundação', unidade: 'm²' },
  { descricao: 'Concreto usinado, fck = 30 MPa', unidade: 'm³' },
  { descricao: 'Lançamento e adensamento de concreto ou massa em fundação', unidade: 'm³' },
  { descricao: 'Armadura em barra de aço CA-50 (A ou B) fyk = 500 MPa', unidade: 'kg' },
  { descricao: 'Alvenaria de bloco de concreto estrutural 19 cm - classe B', unidade: 'm²' },
  { descricao: 'Argamassa graute', unidade: 'm³' },
  { descricao: 'Dreno com pedra britada', unidade: 'm³' },
  { descricao: 'Manta geotêxtil com resistência à tração longitudinal de 10kN/m e transversal de 9kN/m', unidade: 'm²' },
  { descricao: 'Tubo em polietileno de alta densidade corrugado perfurado, DN= 4", inclusive conexões', unidade: 'm' },
  { descricao: 'Colchão de areia', unidade: 'm³' },
  { descricao: 'Poço de retenção de água pluvial ϕ 2,50 m com fundo de brita', unidade: 'm' },
  { descricao: 'Tampa pré-moldada ϕ 2,50 m para poço de retenção de A. P. com tampa de inspeção ϕ 0,60 m', unidade: 'un' },
  { descricao: 'Reaterro manual apiloado sem controle de compactação', unidade: 'm³' },
  { descricao: 'Broca em concreto armado diâmetro de 20 cm - completa', unidade: 'm' },
  { descricao: 'Alvenaria de bloco de concreto estrutural 14 cm - classe B', unidade: 'm²' },
  { descricao: 'Guarda-corpo tubular com tela em aço galvanizado, diâmetro de 1 1/2"', unidade: 'm' },
  { descricao: 'Corrimão tubular em aço galvanizado, diâmetro 2"', unidade: 'm' },
  { descricao: 'Esmalte à base água em superfície metálica, inclusive preparo', unidade: 'm²' },
  { descricao: 'Concreto usinado, fck = 30 MPa - para bombeamento', unidade: 'm³' },
  { descricao: 'Fibra em polipropileno (macrofibra), resistência residual 4,3+-0,3 Mpa', unidade: 'kg' },
  { descricao: 'Fibra polimérica (microfibra anticrack), tenacidade mínima 5cN/dtex', unidade: 'kg' },
  { descricao: 'Lançamento e adensamento de concreto ou massa por bombeamento', unidade: 'm³' },
  { descricao: 'Nivelamento de piso em concreto com acabadora de superfície', unidade: 'm²' },
  { descricao: 'Cura química de concreto, membrana líquida', unidade: 'm²' },
  { descricao: 'Corte de junta de dilatação, com serra de disco diamantado para pisos', unidade: 'm' },
  { descricao: 'Acrílico para quadras e pisos cimentados', unidade: 'm²' },
  { descricao: 'Armadura em tela soldada de aço', unidade: 'kg' },
  { descricao: 'Fornecimento de peças diversas para estrutura em madeira', unidade: 'm³' },
  { descricao: 'Verniz fungicida para madeira', unidade: 'm²' },
  { descricao: 'Fornecimento e montagem de estrutura em aço ASTM-A36, sem pintura', unidade: 'kg' },
  { descricao: 'Escavação manual em solo de 1ª e 2ª categoria em vala ou cava até 1,5 m', unidade: 'm³' },
  { descricao: 'Escavação manual em solo de 1ª e 2ª categoria em campo aberto', unidade: 'm³' },
  { descricao: 'Entrada completa de água com abrigo e registro de gaveta, DN= 3/4"', unidade: 'un' },
  { descricao: 'Tubo de PVC rígido soldável marrom, DN= 25 mm (3/4"), inclusive conexões', unidade: 'm' },
  { descricao: 'Torneira de jardim', unidade: 'un' },
  { descricao: 'Eletroduto corrugado em polietileno de alta densidade, DN= 30 mm, com acessórios', unidade: 'm' },
  { descricao: 'Eletroduto corrugado em polietileno de alta densidade, DN= 75 mm, com acessórios', unidade: 'm' },
  { descricao: 'Caixa em PVC de 4" x 2"', unidade: 'un' },
  { descricao: 'Caixa de passagem em chapa, com tampa parafusada, 200 x 200 x 100 mm', unidade: 'un' },
  { descricao: 'Tomada 2P+T de 10 A - 250 V, completa', unidade: 'cj' },
  { descricao: 'Portão de tela para quadra', unidade: 'm²' },
  { descricao: 'Fechamento para quadra de esportes - Broca', unidade: 'm' },
  { descricao: 'Broca em concreto armado diâmetro de 25 cm - completa', unidade: 'm' },
]

const categoriaFornLabel: Record<FornecedorCategoria, string> = {
  material: 'Material',
  servico: 'Serviço',
  ambos: 'Ambos',
}

const categoriaMatLabel: Record<MaterialCategoria, string> = {
  cimento: 'Cimento',
  aco: 'Aço',
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  epi: 'EPI',
  ferramentas: 'Ferramentas',
  madeira: 'Madeira',
  outros: 'Outros',
}

const thClass = 'text-left text-xs font-medium text-[var(--color-muted)] py-3 px-3'
const tdClass = 'py-2.5 px-3 text-sm text-[var(--color-text)]'
const inputClass = 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] h-8 text-xs'

export function CadastrosPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [fornecedores, setFornecedores] = useState<CadastroFornecedor[]>([])
  const [materiais, setMateriais] = useState<CadastroMaterial[]>([])
  const [prestadores, setPrestadores] = useState<CadastroPrestador[]>([])
  const [seeded, setSeeded] = useState(false)

  const [editFornId, setEditFornId] = useState<string | null>(null)
  const [editForn, setEditForn] = useState<Partial<CadastroFornecedor>>({})
  const [editMatId, setEditMatId] = useState<string | null>(null)
  const [editMat, setEditMat] = useState<Partial<CadastroMaterial>>({})
  const [editPrestId, setEditPrestId] = useState<string | null>(null)
  const [editPrest, setEditPrest] = useState<Partial<CadastroPrestador>>({})

  const [newForn, setNewForn] = useState({ nome: '', cpf_cnpj: '', telefone: '', categoria: 'ambos' as FornecedorCategoria })
  const [newMat, setNewMat] = useState({ descricao: '', unidade: '', categoria: 'outros' as MaterialCategoria })
  const [newPrest, setNewPrest] = useState({ nome: '', cpf: '', funcao: '', telefone: '' })
  const [addingForn, setAddingForn] = useState(false)
  const [addingMat, setAddingMat] = useState(false)
  const [addingPrest, setAddingPrest] = useState(false)
  const [saving, setSaving] = useState(false)

  const [searchForn, setSearchForn] = useState('')
  const [searchMat, setSearchMat] = useState('')
  const [searchPrest, setSearchPrest] = useState('')

  useEffect(() => {
    if (user) loadAll()
  }, [user])

  async function loadAll() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const [fRes, mRes, pRes] = await Promise.all([
      db.from('cadastro_fornecedores').select('*').eq('user_id', user!.id).order('nome'),
      db.from('cadastro_materiais').select('*').eq('user_id', user!.id).order('descricao'),
      db.from('cadastro_prestadores').select('*').eq('user_id', user!.id).order('nome'),
    ])
    if (fRes.data) setFornecedores(fRes.data as CadastroFornecedor[])
    if (mRes.data) {
      setMateriais(mRes.data as CadastroMaterial[])
      if ((mRes.data as CadastroMaterial[]).length === 0 && !seeded) {
        setSeeded(true)
        await seedMateriais()
      }
    }
    if (pRes.data) setPrestadores(pRes.data as CadastroPrestador[])
  }

  async function seedMateriais() {
    const inserts = SEED_MATERIAIS.map(m => ({
      user_id: user!.id,
      descricao: m.descricao,
      unidade: m.unidade,
      categoria: 'outros' as MaterialCategoria,
    }))
    await (supabase as any).from('cadastro_materiais').insert(inserts)
    const { data } = await (supabase as any).from('cadastro_materiais').select('*').eq('user_id', user!.id).order('descricao')
    if (data) setMateriais(data as CadastroMaterial[])
  }

  // ── Fornecedores ──────────────────────────────────────────────────────────────

  async function saveForn() {
    if (!newForn.nome.trim()) return
    setSaving(true)
    await (supabase as any).from('cadastro_fornecedores').insert({ user_id: user!.id, ...newForn })
    setNewForn({ nome: '', cpf_cnpj: '', telefone: '', categoria: 'ambos' })
    setAddingForn(false)
    setSaving(false)
    loadAll()
  }

  async function updateForn(id: string) {
    if (!editForn.nome?.trim()) return
    setSaving(true)
    await (supabase as any).from('cadastro_fornecedores').update(editForn).eq('id', id).eq('user_id', user!.id)
    setEditFornId(null)
    setSaving(false)
    loadAll()
  }

  async function deleteForn(id: string) {
    if (!confirm('Excluir este fornecedor?')) return
    await (supabase as any).from('cadastro_fornecedores').delete().eq('id', id).eq('user_id', user!.id)
    loadAll()
  }

  // ── Materiais ────────────────────────────────────────────────────────────────

  async function saveMat() {
    if (!newMat.descricao.trim() || !newMat.unidade.trim()) {
      toast({ title: 'Preencha descrição e unidade', variant: 'destructive' })
      return
    }
    setSaving(true)
    await (supabase as any).from('cadastro_materiais').insert({ user_id: user!.id, ...newMat })
    setNewMat({ descricao: '', unidade: '', categoria: 'outros' })
    setAddingMat(false)
    setSaving(false)
    loadAll()
  }

  async function updateMat(id: string) {
    if (!editMat.descricao?.trim()) return
    setSaving(true)
    await (supabase as any).from('cadastro_materiais').update(editMat).eq('id', id).eq('user_id', user!.id)
    setEditMatId(null)
    setSaving(false)
    loadAll()
  }

  async function deleteMat(id: string) {
    if (!confirm('Excluir este material do catálogo?')) return
    await (supabase as any).from('cadastro_materiais').delete().eq('id', id).eq('user_id', user!.id)
    loadAll()
  }

  // ── Prestadores ──────────────────────────────────────────────────────────────

  async function savePrest() {
    if (!newPrest.nome.trim()) return
    setSaving(true)
    await (supabase as any).from('cadastro_prestadores').insert({ user_id: user!.id, ...newPrest })
    setNewPrest({ nome: '', cpf: '', funcao: '', telefone: '' })
    setAddingPrest(false)
    setSaving(false)
    loadAll()
  }

  async function updatePrest(id: string) {
    if (!editPrest.nome?.trim()) return
    setSaving(true)
    await (supabase as any).from('cadastro_prestadores').update(editPrest).eq('id', id).eq('user_id', user!.id)
    setEditPrestId(null)
    setSaving(false)
    loadAll()
  }

  async function deletePrest(id: string) {
    if (!confirm('Excluir este prestador?')) return
    await (supabase as any).from('cadastro_prestadores').delete().eq('id', id).eq('user_id', user!.id)
    loadAll()
  }

  const filteredForn = fornecedores.filter(f => f.nome.toLowerCase().includes(searchForn.toLowerCase()))
  const filteredMat = materiais.filter(m => m.descricao.toLowerCase().includes(searchMat.toLowerCase()))
  const filteredPrest = prestadores.filter(p => p.nome.toLowerCase().includes(searchPrest.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BookUser className="w-6 h-6 text-[var(--color-primary)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Cadastros</h1>
      </div>

      <Tabs defaultValue="fornecedores">
        <TabsList className="bg-[var(--color-surface-2)]">
          <TabsTrigger value="fornecedores" className="data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)] gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="materiais" className="data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)] gap-1.5">
            <Package className="w-3.5 h-3.5" /> Catálogo de Materiais
          </TabsTrigger>
          <TabsTrigger value="prestadores" className="data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-primary)] text-[var(--color-muted)] gap-1.5">
            <Users className="w-3.5 h-3.5" /> Prestadores
          </TabsTrigger>
        </TabsList>

        {/* ── Fornecedores ── */}
        <TabsContent value="fornecedores" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Buscar fornecedor..." value={searchForn} onChange={e => setSearchForn(e.target.value)} className="max-w-xs bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            <Button onClick={() => setAddingForn(true)} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white gap-1.5 ml-auto">
              + Adicionar
            </Button>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--color-surface-2)]">
                <tr>
                  <th className={thClass}>Nome</th>
                  <th className={thClass}>CNPJ/CPF</th>
                  <th className={thClass}>Telefone</th>
                  <th className={thClass}>Categoria</th>
                  <th className={`${thClass} text-center`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {addingForn && (
                  <tr className="bg-[var(--color-surface-2)]">
                    <td className={tdClass}><Input value={newForn.nome} onChange={e => setNewForn(v => ({ ...v, nome: e.target.value }))} className={inputClass} placeholder="Nome *" autoFocus /></td>
                    <td className={tdClass}><Input value={newForn.cpf_cnpj} onChange={e => setNewForn(v => ({ ...v, cpf_cnpj: e.target.value }))} className={inputClass} placeholder="CNPJ/CPF" /></td>
                    <td className={tdClass}><Input value={newForn.telefone} onChange={e => setNewForn(v => ({ ...v, telefone: e.target.value }))} className={inputClass} placeholder="Telefone" /></td>
                    <td className={tdClass}>
                      <Select value={newForn.categoria} onValueChange={v => setNewForn(f => ({ ...f, categoria: v as FornecedorCategoria }))}>
                        <SelectTrigger className={`${inputClass} w-28`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                          {(Object.entries(categoriaFornLabel) as [FornecedorCategoria, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" onClick={saveForn} disabled={saving} className="h-7 text-xs bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-white">{saving ? '...' : 'Salvar'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingForn(false)} className="h-7 text-xs text-[var(--color-muted)]">Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredForn.map(f => editFornId === f.id ? (
                  <tr key={f.id} className="bg-[var(--color-surface-2)]">
                    <td className={tdClass}><Input value={editForn.nome ?? ''} onChange={e => setEditForn(v => ({ ...v, nome: e.target.value }))} className={inputClass} /></td>
                    <td className={tdClass}><Input value={editForn.cpf_cnpj ?? ''} onChange={e => setEditForn(v => ({ ...v, cpf_cnpj: e.target.value }))} className={inputClass} /></td>
                    <td className={tdClass}><Input value={editForn.telefone ?? ''} onChange={e => setEditForn(v => ({ ...v, telefone: e.target.value }))} className={inputClass} /></td>
                    <td className={tdClass}>
                      <Select value={editForn.categoria ?? 'ambos'} onValueChange={v => setEditForn(ef => ({ ...ef, categoria: v as FornecedorCategoria }))}>
                        <SelectTrigger className={`${inputClass} w-28`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                          {(Object.entries(categoriaFornLabel) as [FornecedorCategoria, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" onClick={() => updateForn(f.id)} disabled={saving} className="h-7 text-xs bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-white">{saving ? '...' : 'Salvar'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditFornId(null)} className="h-7 text-xs text-[var(--color-muted)]">Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={f.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className={tdClass}>{f.nome}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{f.cpf_cnpj || '—'}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{f.telefone || '—'}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{categoriaFornLabel[f.categoria]}</td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => { setEditFornId(f.id); setEditForn(f) }} className="h-7 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]">Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteForn(f.id)} className="h-7 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredForn.length === 0 && !addingForn && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-[var(--color-muted)]">Nenhum fornecedor cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Materiais ── */}
        <TabsContent value="materiais" className="mt-4 space-y-3">
          <div className="flex gap-2 items-center">
            <Input placeholder="Buscar material..." value={searchMat} onChange={e => setSearchMat(e.target.value)} className="max-w-xs bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            <span className="text-xs text-[var(--color-muted)]">{materiais.length} itens</span>
            <Button onClick={() => setAddingMat(true)} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white gap-1.5 ml-auto">
              + Adicionar
            </Button>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--color-surface-2)]">
                <tr>
                  <th className={thClass}>Descrição</th>
                  <th className={thClass}>Unidade</th>
                  <th className={thClass}>Categoria</th>
                  <th className={`${thClass} text-center`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {addingMat && (
                  <tr className="bg-[var(--color-surface-2)]">
                    <td className={tdClass}><Input value={newMat.descricao} onChange={e => setNewMat(v => ({ ...v, descricao: e.target.value }))} className={inputClass} placeholder="Descrição *" autoFocus /></td>
                    <td className={tdClass}><Input value={newMat.unidade} onChange={e => setNewMat(v => ({ ...v, unidade: e.target.value }))} className={`${inputClass} w-20`} placeholder="un *" /></td>
                    <td className={tdClass}>
                      <Select value={newMat.categoria} onValueChange={v => setNewMat(m => ({ ...m, categoria: v as MaterialCategoria }))}>
                        <SelectTrigger className={`${inputClass} w-32`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                          {(Object.entries(categoriaMatLabel) as [MaterialCategoria, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" onClick={saveMat} disabled={saving} className="h-7 text-xs bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-white">{saving ? '...' : 'Salvar'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingMat(false)} className="h-7 text-xs text-[var(--color-muted)]">Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredMat.map(m => editMatId === m.id ? (
                  <tr key={m.id} className="bg-[var(--color-surface-2)]">
                    <td className={tdClass}><Input value={editMat.descricao ?? ''} onChange={e => setEditMat(v => ({ ...v, descricao: e.target.value }))} className={inputClass} /></td>
                    <td className={tdClass}><Input value={editMat.unidade ?? ''} onChange={e => setEditMat(v => ({ ...v, unidade: e.target.value }))} className={`${inputClass} w-20`} /></td>
                    <td className={tdClass}>
                      <Select value={editMat.categoria ?? 'outros'} onValueChange={v => setEditMat(em => ({ ...em, categoria: v as MaterialCategoria }))}>
                        <SelectTrigger className={`${inputClass} w-32`}><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[var(--color-surface)] border-[var(--color-border)]">
                          {(Object.entries(categoriaMatLabel) as [MaterialCategoria, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" onClick={() => updateMat(m.id)} disabled={saving} className="h-7 text-xs bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-white">{saving ? '...' : 'Salvar'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditMatId(null)} className="h-7 text-xs text-[var(--color-muted)]">Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className={tdClass}>{m.descricao}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{m.unidade}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{categoriaMatLabel[m.categoria]}</td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => { setEditMatId(m.id); setEditMat(m) }} className="h-7 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]">Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMat(m.id)} className="h-7 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMat.length === 0 && !addingMat && (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-[var(--color-muted)]">Nenhum material cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Prestadores ── */}
        <TabsContent value="prestadores" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Buscar prestador..." value={searchPrest} onChange={e => setSearchPrest(e.target.value)} className="max-w-xs bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)]" />
            <Button onClick={() => setAddingPrest(true)} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white gap-1.5 ml-auto">
              + Adicionar
            </Button>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--color-surface-2)]">
                <tr>
                  <th className={thClass}>Nome</th>
                  <th className={thClass}>CPF</th>
                  <th className={thClass}>Função</th>
                  <th className={thClass}>Telefone</th>
                  <th className={`${thClass} text-center`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {addingPrest && (
                  <tr className="bg-[var(--color-surface-2)]">
                    <td className={tdClass}><Input value={newPrest.nome} onChange={e => setNewPrest(v => ({ ...v, nome: e.target.value }))} className={inputClass} placeholder="Nome *" autoFocus /></td>
                    <td className={tdClass}><Input value={newPrest.cpf} onChange={e => setNewPrest(v => ({ ...v, cpf: e.target.value }))} className={inputClass} placeholder="CPF" /></td>
                    <td className={tdClass}><Input value={newPrest.funcao} onChange={e => setNewPrest(v => ({ ...v, funcao: e.target.value }))} className={inputClass} placeholder="Ex: Pedreiro" /></td>
                    <td className={tdClass}><Input value={newPrest.telefone} onChange={e => setNewPrest(v => ({ ...v, telefone: e.target.value }))} className={inputClass} placeholder="Telefone" /></td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" onClick={savePrest} disabled={saving} className="h-7 text-xs bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-white">{saving ? '...' : 'Salvar'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingPrest(false)} className="h-7 text-xs text-[var(--color-muted)]">Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredPrest.map(p => editPrestId === p.id ? (
                  <tr key={p.id} className="bg-[var(--color-surface-2)]">
                    <td className={tdClass}><Input value={editPrest.nome ?? ''} onChange={e => setEditPrest(v => ({ ...v, nome: e.target.value }))} className={inputClass} /></td>
                    <td className={tdClass}><Input value={editPrest.cpf ?? ''} onChange={e => setEditPrest(v => ({ ...v, cpf: e.target.value }))} className={inputClass} /></td>
                    <td className={tdClass}><Input value={editPrest.funcao ?? ''} onChange={e => setEditPrest(v => ({ ...v, funcao: e.target.value }))} className={inputClass} /></td>
                    <td className={tdClass}><Input value={editPrest.telefone ?? ''} onChange={e => setEditPrest(v => ({ ...v, telefone: e.target.value }))} className={inputClass} /></td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" onClick={() => updatePrest(p.id)} disabled={saving} className="h-7 text-xs bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-white">{saving ? '...' : 'Salvar'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditPrestId(null)} className="h-7 text-xs text-[var(--color-muted)]">Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td className={tdClass}>{p.nome}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{p.cpf || '—'}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{p.funcao || '—'}</td>
                    <td className={`${tdClass} text-[var(--color-muted)]`}>{p.telefone || '—'}</td>
                    <td className={`${tdClass} text-center`}>
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => { setEditPrestId(p.id); setEditPrest(p) }} className="h-7 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]">Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePrest(p.id)} className="h-7 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPrest.length === 0 && !addingPrest && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-[var(--color-muted)]">Nenhum prestador cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
