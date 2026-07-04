import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, AlertTriangle, ClipboardPaste, ChevronRight, Upload, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ValorMonetario } from '@/components/shared/ValorMonetario'
import type { PlanilhaItem, Obra, VwPlanilhaSaldo } from '@/types'

const fmt3 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

type ItemComSaldo = PlanilhaItem & Partial<VwPlanilhaSaldo>

export function PlanilhaServicosPage() {
  const { id: obraId } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [obra, setObra] = useState<Obra | null>(null)
  const [itens, setItens] = useState<ItemComSaldo[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<PlanilhaItem>>({})
  const [pastaTexto, setPastaTexto] = useState('')
  const [previewLinhas, setPreviewLinhas] = useState<string[][]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // import extras
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste')
  const [xlsxSheets, setXlsxSheets] = useState<string[]>([])
  const [xlsxWorkbook, setXlsxWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [selectedSheet, setSelectedSheet] = useState('')
  const [skipHeader, setSkipHeader] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user || !obraId) return
    loadData()
  }, [user, obraId])

  async function loadData() {
    setLoading(true)
    const [obraRes, itensRes, saldoRes] = await Promise.all([
      supabase.from('obras').select('*').eq('id', obraId!).eq('user_id', user!.id).single(),
      supabase.from('planilha_itens').select('*').eq('obra_id', obraId!).eq('user_id', user!.id).order('ordem'),
      supabase.from('vw_planilha_saldo').select('*').eq('obra_id', obraId!).eq('user_id', user!.id),
    ])
    if (obraRes.data) setObra(obraRes.data)
    if (itensRes.data) {
      const saldoMap = new Map((saldoRes.data ?? []).map(s => [s.planilha_item_id, s]))
      setItens(itensRes.data.map(item => ({ ...item, ...saldoMap.get(item.id) })))
    }
    setLoading(false)
  }

  const somaItens = itens.reduce((acc, i) => acc + i.valor_total, 0)
  // Both somaItens and obra.valor_total are centavos (bigint) — compare as integers (threshold: 1 centavo)
  const divergente = obra && Math.abs(somaItens - obra.valor_total) > 1

  function startEdit(item: PlanilhaItem) {
    setEditingId(item.id)
    setEditValues({
      codigo: item.codigo ?? '',
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade_contratada: item.quantidade_contratada,
      // DB stores centavos (bigint) — show reais in the edit input
      valor_unitario: item.valor_unitario / 100,
      ordem: item.ordem,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  async function saveEdit(itemId: string) {
    if (!editValues.descricao?.trim()) {
      toast({ title: 'Descrição obrigatória', description: 'Preencha a descrição do item antes de salvar.', variant: 'destructive' })
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('planilha_itens')
      .update({
        codigo: editValues.codigo || null,
        descricao: editValues.descricao!,
        unidade: editValues.unidade!,
        quantidade_contratada: Number(editValues.quantidade_contratada),
        // Input shows reais — convert back to centavos (bigint) for DB
        valor_unitario: Math.round(Number(editValues.valor_unitario) * 100),
        ordem: Number(editValues.ordem),
      })
      .eq('id', itemId)
      .eq('user_id', user!.id)
    setSaving(false)
    if (!error) {
      setEditingId(null)
      loadData()
    }
  }

  async function addItem() {
    const nextOrdem = itens.length > 0 ? Math.max(...itens.map(i => i.ordem)) + 1 : 1
    const { data, error } = await supabase
      .from('planilha_itens')
      .insert({
        obra_id: obraId!,
        user_id: user!.id,
        codigo: null,
        descricao: 'Novo item',
        unidade: 'un',
        quantidade_contratada: 1,
        valor_unitario: 0,
        ordem: nextOrdem,
      })
      .select()
      .single()
    if (data && !error) {
      await loadData()
      startEdit(data)
    }
  }

  async function deleteItem(itemId: string) {
    const { count } = await supabase
      .from('medicao_itens')
      .select('*', { count: 'exact', head: true })
      .eq('planilha_item_id', itemId)
      .eq('user_id', user!.id)
    if ((count ?? 0) > 0) {
      alert('Não é possível excluir um item que já possui medição registrada.')
      return
    }
    if (!confirm('Excluir este item da planilha?')) return
    await supabase.from('planilha_itens').delete().eq('id', itemId).eq('user_id', user!.id)
    loadData()
  }

  // Detecta se a primeira linha é cabeçalho (contém texto não numérico em cols numéricas)
  function isHeaderRow(row: string[]): boolean {
    const qtdCol = row[3] ?? ''
    const valCol = row[4] ?? ''
    const qtdNum = Number(qtdCol.replace(',', '.').replace(/[^\d.-]/g, ''))
    const valNum = Number(valCol.replace(',', '.').replace(/[^\d.-]/g, ''))
    return isNaN(qtdNum) || isNaN(valNum) || (qtdCol !== '' && qtdNum === 0 && isNaN(Number(qtdCol)))
  }

  function parseLinhasRaw(rows: string[][]): string[][] {
    const filtered = rows.filter(l => l.length >= 2 && l.some(c => c !== ''))
    if (skipHeader && filtered.length > 0 && isHeaderRow(filtered[0])) {
      return filtered.slice(1)
    }
    return filtered
  }

  function parsePasta(texto: string) {
    const separator = texto.includes('\t') ? '\t' : ';'
    const rows = texto
      .trim()
      .split('\n')
      .map(l => l.split(separator).map(c => c.trim()))
    setPreviewLinhas(parseLinhasRaw(rows))
  }

  function parseXlsxSheet(wb: XLSX.WorkBook, sheetName: string) {
    const ws = wb.Sheets[sheetName]
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]
    const stringRows = rows.map(r => r.map(c => String(c ?? '').trim()))
    setPreviewLinhas(parseLinhasRaw(stringRows))
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const data = new Uint8Array(evt.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      setXlsxWorkbook(wb)
      setXlsxSheets(wb.SheetNames)
      const first = wb.SheetNames[0]
      setSelectedSheet(first)
      parseXlsxSheet(wb, first)
    }
    reader.readAsArrayBuffer(file)
  }

  function handleSheetChange(sheet: string) {
    setSelectedSheet(sheet)
    if (xlsxWorkbook) parseXlsxSheet(xlsxWorkbook, sheet)
  }

  function rowHasError(cols: string[]): boolean {
    const qtd = Number(cols[3]?.replace(',', '.').replace(/[^\d.-]/g, '') || '0')
    const val = Number(cols[4]?.replace(',', '.').replace(/[^\d.-]/g, '') || '0')
    return !cols[1]?.trim() || isNaN(qtd) || isNaN(val) || qtd < 0 || val < 0
  }

  function closeImportDialog() {
    setDialogOpen(false)
    setPastaTexto('')
    setPreviewLinhas([])
    setXlsxSheets([])
    setXlsxWorkbook(null)
    setSelectedSheet('')
    setImportMode('paste')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const linhasValidas = previewLinhas.filter(r => !rowHasError(r))

  async function importarLinhas() {
    if (linhasValidas.length === 0) return
    setSaving(true)
    const nextOrdem = itens.length > 0 ? Math.max(...itens.map(i => i.ordem)) + 1 : 1
    const inserts = linhasValidas.map((cols, idx) => ({
      obra_id: obraId!,
      user_id: user!.id,
      codigo: cols[0] || null,
      descricao: cols[1] || 'Item importado',
      unidade: cols[2] || 'un',
      quantidade_contratada: Number(cols[3]?.replace(',', '.').replace(/[^\d.-]/g, '') || 0),
      // Excel values are in reais — convert to centavos (bigint) for DB
      valor_unitario: Math.round(Number(cols[4]?.replace(',', '.').replace(/[^\d.-]/g, '') || 0) * 100),
      ordem: nextOrdem + idx,
    }))
    const { error } = await supabase.from('planilha_itens').insert(inserts)
    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao importar linhas', description: error.message, variant: 'destructive' })
      return
    }
    closeImportDialog()
    loadData()
  }

  const thClass = 'text-left text-xs font-medium text-[var(--color-muted)] py-3 px-4'
  const tdClass = 'py-3 px-4 text-sm text-[var(--color-text)]'
  const inputClass =
    'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] h-8 text-xs'

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-[var(--color-muted)]">
        <Link to="/obras" className="hover:text-[var(--color-text)]">
          Obras
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/obras/${obraId}`} className="hover:text-[var(--color-text)]">
          {obra?.nome ?? 'Obra'}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[var(--color-text)]">Planilha de Serviços</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Planilha de Serviços</h1>
        <div className="flex gap-2">
          {/* Modal Importar do Excel */}
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeImportDialog(); else setDialogOpen(true) }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] gap-2"
              >
                <ClipboardPaste className="w-4 h-4" />
                Importar Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--color-surface)] border-[var(--color-border)] max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-[var(--color-text)]">Importar do Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">

                {/* Abas modo */}
                <div className="flex gap-1 p-1 bg-[var(--color-surface-2)] rounded-md w-fit">
                  <button
                    onClick={() => setImportMode('paste')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${importMode === 'paste' ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" /> Colar dados
                  </button>
                  <button
                    onClick={() => setImportMode('file')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${importMode === 'file' ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Arquivo .xlsx
                  </button>
                </div>

                <p className="text-xs text-[var(--color-muted)]">
                  Ordem esperada das colunas:{' '}
                  <strong className="text-[var(--color-text)]">Código · Descrição · Unidade · Quantidade · Valor Unitário</strong>
                </p>

                {/* Modo: colar */}
                {importMode === 'paste' && (
                  <textarea
                    value={pastaTexto}
                    onChange={e => { setPastaTexto(e.target.value); parsePasta(e.target.value) }}
                    rows={7}
                    className="w-full rounded-md border bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text)] px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="Cole aqui os dados copiados do Excel (Tab ou ; como separador)..."
                  />
                )}

                {/* Modo: arquivo */}
                {importMode === 'file' && (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                      <Upload className="w-6 h-6 text-[var(--color-muted)]" />
                      <span className="text-sm text-[var(--color-muted)]">Clique para selecionar arquivo .xlsx ou .xls</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    {xlsxSheets.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-muted)] shrink-0">Aba:</span>
                        <div className="flex flex-wrap gap-1">
                          {xlsxSheets.map(s => (
                            <button
                              key={s}
                              onClick={() => handleSheetChange(s)}
                              className={`px-2 py-0.5 rounded text-xs border transition-colors ${selectedSheet === s ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Opção pular cabeçalho */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipHeader}
                    onChange={e => {
                      setSkipHeader(e.target.checked)
                      if (importMode === 'paste') parsePasta(pastaTexto)
                      else if (xlsxWorkbook && selectedSheet) parseXlsxSheet(xlsxWorkbook, selectedSheet)
                    }}
                    className="rounded"
                  />
                  <span className="text-xs text-[var(--color-muted)]">Pular linha de cabeçalho automaticamente</span>
                </label>

                {/* Preview */}
                {previewLinhas.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--color-muted)] mb-2">
                      {previewLinhas.length} linha(s) detectada(s)
                      {previewLinhas.length !== linhasValidas.length && (
                        <span className="text-[var(--color-danger)] ml-1">
                          · {previewLinhas.length - linhasValidas.length} com erro (destacadas)
                        </span>
                      )}
                      :
                    </p>
                    <div className="max-h-44 overflow-auto rounded border border-[var(--color-border)]">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--color-surface-2)] sticky top-0">
                          <tr>
                            {['Código', 'Descrição', 'Unid.', 'Qtd', 'Valor Unit.'].map(h => (
                              <th key={h} className="px-2 py-1 text-left text-[var(--color-muted)] font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewLinhas.map((row, i) => {
                            const hasErr = rowHasError(row)
                            return (
                              <tr key={i} className={`border-t border-[var(--color-border)] ${hasErr ? 'bg-[var(--color-danger)]/10' : ''}`}>
                                {[0,1,2,3,4].map(j => (
                                  <td key={j} className={`px-2 py-1 ${hasErr && (j === 1 && !row[1]?.trim() || j >= 3) ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}`}>
                                    {row[j] ?? ''}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={closeImportDialog}
                    className="border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={importarLinhas}
                    disabled={linhasValidas.length === 0 || saving}
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white"
                  >
                    {saving ? 'Importando...' : `Importar ${linhasValidas.length} linha(s)`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={addItem}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar item
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {itens.length === 0 && !loading && (
        <div className="flex items-start gap-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-warning)]">
            Sem planilha cadastrada — medições não podem ser abertas. Adicione itens acima.
          </p>
        </div>
      )}
      {divergente && (
        <div className="flex items-start gap-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-danger)]">
            Soma dos itens (<ValorMonetario value={somaItens} className="font-semibold" />) difere
            do valor contratado (
            <ValorMonetario value={obra?.valor_total ?? 0} className="font-semibold" />
            ). Revise antes de gerar medição.
          </p>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-surface-2)]">
              <tr>
                <th className={thClass}>Código</th>
                <th className={thClass}>Descrição</th>
                <th className={thClass}>Unid.</th>
                <th className={`${thClass} text-right`}>Qtd Contratada</th>
                <th className={`${thClass} text-right`}>Valor Unit.</th>
                <th className={`${thClass} text-right`}>Valor Total</th>
                <th className={`${thClass} text-right`}>Medido</th>
                <th className={`${thClass} text-right`}>Restante</th>
                <th className={`${thClass} text-center`}>% Exec</th>
                <th className={`${thClass} text-center`}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[var(--color-muted)] text-sm">
                    Carregando...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[var(--color-muted)] text-sm">
                    Nenhum item cadastrado.
                  </td>
                </tr>
              ) : (
                itens.map(item =>
                  editingId === item.id ? (
                    <tr key={item.id} className="bg-[var(--color-surface-2)]">
                      <td className={tdClass}>
                        <Input
                          value={editValues.codigo ?? ''}
                          onChange={e => setEditValues(v => ({ ...v, codigo: e.target.value }))}
                          className={inputClass}
                          placeholder="Cód."
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          value={editValues.descricao ?? ''}
                          onChange={e => setEditValues(v => ({ ...v, descricao: e.target.value }))}
                          className={inputClass}
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          value={editValues.unidade ?? ''}
                          onChange={e => setEditValues(v => ({ ...v, unidade: e.target.value }))}
                          className={`${inputClass} w-16`}
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          step="0.001"
                          value={editValues.quantidade_contratada ?? 0}
                          onChange={e =>
                            setEditValues(v => ({
                              ...v,
                              quantidade_contratada: Number(e.target.value),
                            }))
                          }
                          className={`${inputClass} text-right w-24`}
                        />
                      </td>
                      <td className={tdClass}>
                        <Input
                          type="number"
                          step="0.01"
                          value={editValues.valor_unitario ?? 0}
                          onChange={e =>
                            setEditValues(v => ({
                              ...v,
                              valor_unitario: Number(e.target.value),
                            }))
                          }
                          className={`${inputClass} text-right w-28`}
                        />
                      </td>
                      <td className={`${tdClass} text-right font-mono`}>
                        {/*
                          Preview: editValues.valor_unitario is in reais (user input).
                          Multiply by 100 → centavos, then multiply by quantity → centavos total.
                          ValorMonetario divides by 100 for display.
                        */}
                        <ValorMonetario
                          value={
                            (editValues.quantidade_contratada ?? 0) *
                            Math.round((editValues.valor_unitario ?? 0) * 100)
                          }
                        />
                      </td>
                      <td className={`${tdClass} text-right font-mono text-[var(--color-muted)]`}>
                        —
                      </td>
                      <td className={`${tdClass} text-right font-mono text-[var(--color-muted)]`}>
                        —
                      </td>
                      <td className="text-center" />
                      <td className={`${tdClass} text-center`}>
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(item.id)}
                            disabled={saving}
                            className="h-7 text-xs bg-[var(--color-success)] hover:bg-[var(--color-success)]/80 text-white"
                          >
                            {saving ? '...' : 'Salvar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-7 text-xs text-[var(--color-muted)]"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={item.id}
                      className="hover:bg-[var(--color-surface-2)] transition-colors"
                    >
                      <td className={`${tdClass} text-[var(--color-muted)]`}>
                        {item.codigo ?? '—'}
                      </td>
                      <td className={tdClass}>{item.descricao}</td>
                      <td className={`${tdClass} text-[var(--color-muted)]`}>{item.unidade}</td>
                      <td className={`${tdClass} text-right font-mono`}>
                        {fmt3.format(item.quantidade_contratada)}
                      </td>
                      <td className={`${tdClass} text-right font-mono`}>
                        <ValorMonetario value={item.valor_unitario} />
                      </td>
                      <td className={`${tdClass} text-right font-mono font-medium`}>
                        <ValorMonetario value={item.valor_total} />
                      </td>
                      <td className={`${tdClass} text-right font-mono text-[var(--color-muted)]`}>
                        {fmt3.format(item.quantidade_medida ?? 0)}
                      </td>
                      <td className={`${tdClass} text-right font-mono text-[var(--color-muted)]`}>
                        {fmt3.format(item.quantidade_restante ?? item.quantidade_contratada)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[var(--color-surface-2)] rounded-full h-1.5 min-w-[40px]">
                            <div
                              className="bg-[var(--color-primary)] h-1.5 rounded-full transition-all"
                              style={{
                                width: `${Math.min(item.percentual_executado ?? 0, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-[var(--color-muted)] w-10 text-right">
                            {(item.percentual_executado ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(item)}
                            className="h-7 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteItem(item.id)}
                            className="h-7 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>

            {/* Rodapé com totais */}
            {itens.length > 0 && (
              <tfoot className="bg-[var(--color-surface-2)] border-t-2 border-[var(--color-border)]">
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]"
                  >
                    Total ({itens.length} {itens.length === 1 ? 'item' : 'itens'})
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[var(--color-text)]">
                    <ValorMonetario value={somaItens} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-muted)]">
                    {fmt3.format(itens.reduce((acc, i) => acc + (i.quantidade_medida ?? 0), 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
