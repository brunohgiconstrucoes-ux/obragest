// ============================================================
// types.ts — Tipos TypeScript derivados do SCHEMA.sql
// Sistema de Gestão de Construtora (Licitação Pública)
//
// Uso: import { Obra, Medicao, ... } from '@/types'
// Convenção: tipos em PascalCase, enums como union types
// ============================================================

export type ObraStatus = 'em_andamento' | 'paralisada' | 'concluida'

export type RegimeTributario =
  | 'simples_nacional'
  | 'lucro_presumido'
  | 'lucro_real'

export type MedicaoStatus = 'aguardando' | 'recebido' | 'parcial'

export type MaoDeObraModalidade = 'nf' | 'rpa' | 'avulso'

export type LancamentoStatus = 'previsto' | 'realizado'

export type FluxoTipo = 'entrada' | 'saida'

export type FluxoEscopo = 'pj_obra' | 'pj_admin' | 'pf'

export type FluxoOrigem = 'medicao' | 'material' | 'mao_de_obra' | 'manual'

export type MaterialCategoria =
  | 'cimento'
  | 'aco'
  | 'eletrica'
  | 'hidraulica'
  | 'epi'
  | 'ferramentas'
  | 'madeira'
  | 'outros'

export type FormaPagamento =
  | 'avista'
  | 'boleto'
  | 'cartao'
  | 'cheque'
  | 'prazo'

export type Perfil = {
  id: string
  razao_social: string | null
  cnpj: string | null
  endereco_pj: string | null
  regime_tributario: RegimeTributario | null
  responsavel_tecnico: string | null
  crea_cau: string | null
  logo_url: string | null
  nome_completo: string | null
  cpf: string | null
  endereco_pf: string | null
  aliquota_caucao: number
  aliquota_iss: number
  aliquota_inss: number
  aliquota_irrf: number
  created_at: string
  updated_at: string
}

export type Obra = {
  id: string
  user_id: string
  nome: string
  numero_licitacao: string | null
  orgao_contratante: string
  objeto: string | null
  art_rrt: string | null
  data_assinatura: string | null
  prazo_termino: string | null
  valor_total: number
  endereco: string | null
  status: ObraStatus
  aliquota_caucao: number
  aliquota_iss: number
  aliquota_inss: number
  aliquota_irrf: number
  created_at: string
  updated_at: string
}

export type PlanilhaItem = {
  id: string
  obra_id: string
  user_id: string
  codigo: string | null
  descricao: string
  unidade: string
  quantidade_contratada: number
  valor_unitario: number
  valor_total: number
  ordem: number
  created_at: string
  updated_at: string
}

export type Medicao = {
  id: string
  obra_id: string
  user_id: string
  numero: number
  periodo_inicio: string
  periodo_fim: string
  valor_bruto: number
  retencao_caucao: number
  retencao_iss: number
  retencao_inss: number
  retencao_irrf: number
  valor_liquido: number
  status: MedicaoStatus
  data_prevista_recebimento: string | null
  data_recebimento: string | null
  valor_recebido: number | null
  boletim_pdf_url: string | null
  incluir_contador: boolean
  created_at: string
  updated_at: string
}

export type MedicaoItem = {
  id: string
  medicao_id: string
  planilha_item_id: string
  user_id: string
  codigo: string | null
  descricao: string
  unidade: string
  valor_unitario: number
  quantidade_executada: number
  valor_total: number
  created_at: string
}

export type MaoDeObra = {
  id: string
  obra_id: string
  user_id: string
  modalidade: MaoDeObraModalidade
  nome: string
  cpf_cnpj: string | null
  numero_nf: string | null
  funcao: string | null
  valor_bruto: number | null
  retencao_inss: number | null
  retencao_iss: number | null
  retencao_irrf: number | null
  valor_diaria: number | null
  quantidade_dias: number | null
  periodo_inicio: string | null
  periodo_fim: string | null
  valor_pago: number
  data_pagamento: string
  status: LancamentoStatus
  pdf_url: string | null
  incluir_contador: boolean
  observacao: string | null
  created_at: string
  updated_at: string
}

export type Material = {
  id: string
  obra_id: string
  user_id: string
  fornecedor: string
  item: string
  categoria: MaterialCategoria
  quantidade: number | null
  unidade: string | null
  valor_total: number
  data_compra: string
  forma_pagamento: FormaPagamento
  incluir_contador: boolean
  observacao: string | null
  created_at: string
  updated_at: string
}

export type FluxoCaixa = {
  id: string
  user_id: string
  escopo: FluxoEscopo
  obra_id: string | null
  tipo: FluxoTipo
  origem: FluxoOrigem
  origem_id: string | null
  descricao: string
  categoria: string | null
  valor: number
  data_lancamento: string
  status: LancamentoStatus
  data_realizacao: string | null
  incluir_contador: boolean
  observacao: string | null
  created_at: string
  updated_at: string
}

export type ExportacaoContador = {
  id: string
  user_id: string
  mes_referencia: number
  ano_referencia: number
  total_documentos: number
  total_valor: number
  zip_url: string | null
  csv_url: string | null
  pdf_resumo_url: string | null
  gerado_em: string
  created_at: string
}

export type VwPlanilhaSaldo = {
  planilha_item_id: string
  obra_id: string
  user_id: string
  codigo: string | null
  descricao: string
  unidade: string
  quantidade_contratada: number
  valor_unitario: number
  valor_contratado: number
  quantidade_medida: number
  quantidade_restante: number
  valor_medido: number
  percentual_executado: number
}

export type VwObraKpis = {
  obra_id: string
  user_id: string
  valor_contratado: number
  percentual_executado: number
  total_faturado: number
  total_recebido: number
  total_saidas: number
  margem_real: number
}

export type ObraFormData = {
  nome: string
  numero_licitacao: string
  orgao_contratante: string
  objeto: string
  art_rrt: string
  data_assinatura: string
  prazo_termino: string
  valor_total: number | ''
  endereco: string
  status: ObraStatus
  aliquota_caucao: number | ''
  aliquota_iss: number | ''
  aliquota_inss: number | ''
  aliquota_irrf: number | ''
}

export type PlanilhaItemFormData = {
  codigo: string
  descricao: string
  unidade: string
  quantidade_contratada: number | ''
  valor_unitario: number | ''
  ordem: number
}

export type MedicaoFormData = {
  periodo_inicio: string
  periodo_fim: string
  data_prevista_recebimento: string
  itens: MedicaoItemInput[]
}

export type MedicaoItemInput = {
  planilha_item_id: string
  descricao: string
  unidade: string
  valor_unitario: number
  quantidade_executada: number | ''
}

export type MaoDeObraFormNF = {
  nome: string
  cpf_cnpj: string
  numero_nf: string
  valor_pago: number | ''
  data_pagamento: string
  incluir_contador: boolean
  observacao: string
}

export type MaoDeObraFormRPA = {
  nome: string
  cpf_cnpj: string
  funcao: string
  valor_bruto: number | ''
  aliquota_inss: number
  aliquota_iss: number
  aliquota_irrf: number
  data_pagamento: string
  observacao: string
}

export type MaoDeObraFormAvulso = {
  nome: string
  cpf_cnpj: string
  funcao: string
  valor_diaria: number | ''
  quantidade_dias: number | ''
  periodo_inicio: string
  periodo_fim: string
  incluir_contador: boolean
  observacao: string
}

export type MaterialFormData = {
  fornecedor: string
  item: string
  categoria: MaterialCategoria
  quantidade: number | ''
  unidade: string
  valor_total: number | ''
  data_compra: string
  forma_pagamento: FormaPagamento
  incluir_contador: boolean
  observacao: string
}

export type FluxoCaixaManualFormData = {
  escopo: FluxoEscopo
  obra_id: string | null
  tipo: FluxoTipo
  descricao: string
  categoria: string
  valor: number | ''
  data_lancamento: string
  status: LancamentoStatus
  observacao: string
}

export type PerfilFormData = {
  razao_social: string
  cnpj: string
  endereco_pj: string
  regime_tributario: RegimeTributario | ''
  responsavel_tecnico: string
  crea_cau: string
  nome_completo: string
  cpf: string
  endereco_pf: string
  aliquota_caucao: number | ''
  aliquota_iss: number | ''
  aliquota_inss: number | ''
  aliquota_irrf: number | ''
}

export type ObraComKpis = Obra & VwObraKpis

export type PlanilhaItemComSaldo = PlanilhaItem & VwPlanilhaSaldo

export type MedicaoComItens = Medicao & {
  itens: MedicaoItem[]
}

export type ResumoMedicao = {
  valor_bruto: number
  retencao_caucao: number
  retencao_iss: number
  retencao_inss: number
  retencao_irrf: number
  total_retencoes: number
  valor_liquido: number
}

export type ResumoRPA = {
  valor_bruto: number
  retencao_inss: number
  retencao_iss: number
  retencao_irrf: number
  total_retencoes: number
  valor_liquido: number
}

export type SaldosDashboard = {
  saldo_pj: number
  saldo_pf: number
}

export type ItemContador = {
  id: string
  tipo: 'nf' | 'rpa' | 'avulso' | 'boletim' | 'material'
  obra_nome: string | null
  descricao: string
  valor: number
  data: string
  pdf_url: string | null
  incluir: boolean
}

export type Alerta = {
  id: string
  tipo: 'nf_pendente' | 'medicao_aberta' | 'conta_vencendo' | 'rpa_pendente'
  mensagem: string
  obra_id: string | null
  link_acao: string
  criado_em: string
}

export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: Perfil
        Insert: Omit<Perfil, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Perfil, 'id' | 'created_at'>>
        Relationships: []
      }
      obras: {
        Row: Obra
        Insert: Omit<Obra, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Obra, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      planilha_itens: {
        Row: PlanilhaItem
        Insert: Omit<PlanilhaItem, 'id' | 'valor_total' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PlanilhaItem, 'id' | 'user_id' | 'valor_total' | 'created_at'>>
        Relationships: []
      }
      medicoes: {
        Row: Medicao
        Insert: Omit<Medicao, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Medicao, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      medicao_itens: {
        Row: MedicaoItem
        Insert: Omit<MedicaoItem, 'id' | 'valor_total' | 'created_at'>
        Update: Record<string, never>
        Relationships: []
      }
      mao_de_obra: {
        Row: MaoDeObra
        Insert: Omit<MaoDeObra, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MaoDeObra, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      materiais: {
        Row: Material
        Insert: Omit<Material, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Material, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      fluxo_caixa: {
        Row: FluxoCaixa
        Insert: Omit<FluxoCaixa, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FluxoCaixa, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      exportacoes_contador: {
        Row: ExportacaoContador
        Insert: Omit<ExportacaoContador, 'id' | 'gerado_em' | 'created_at'>
        Update: Partial<Omit<ExportacaoContador, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      vw_planilha_saldo: {
        Row: VwPlanilhaSaldo
        Relationships: []
      }
      vw_obra_kpis: {
        Row: VwObraKpis
        Relationships: []
      }
    }
    Functions: {}
    Enums: {}
  }
}
