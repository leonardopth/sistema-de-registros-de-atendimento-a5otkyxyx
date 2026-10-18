import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Table,
  HelpCircle,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { batchImportBudgets, type CreateBudgetDTO } from '@/services/waiver_budgets'

interface ImportBudgetsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

export function ImportBudgetsModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportBudgetsModalProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [fileName, setFileName] = useState('')
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [importing, setImporting] = useState(false)

  // Mapeamento de colunas
  const [colAirline, setColAirline] = useState<string>('')
  const [colCategory, setColCategory] = useState<string>('')
  const [colBudget, setColBudget] = useState<string>('')
  const [colUsed, setColUsed] = useState<string>('')
  const [colCurrency, setColCurrency] = useState<string>('')
  const [colPeriod, setColPeriod] = useState<string>('')
  const [colUnit, setColUnit] = useState<string>('')

  // Valores padrão fallback quando coluna não existir no arquivo
  const [defaultAirline, setDefaultAirline] = useState<string>('latam')
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'BRL' | 'EUR'>('USD')
  const [defaultPeriod, setDefaultPeriod] = useState<string>(
    new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  )

  const resetState = () => {
    setStep(1)
    setFileName('')
    setRawHeaders([])
    setRawRows([])
    setColAirline('')
    setColCategory('')
    setColBudget('')
    setColUsed('')
    setColCurrency('')
    setColPeriod('')
    setColUnit('')
  }

  // Parse CSV simples no navegador
  const parseCSV = (text: string) => {
    // Remove BOM se houver
    const cleanText = text.replace(/^\uFEFF/, '')
    const lines = cleanText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) return { headers: [], rows: [] }

    // Detecta delimitador (, ou ;)
    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : ','

    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim().replace(/^["']|["']$/g, ''))
          cur = ''
        } else {
          cur += char
        }
      }
      result.push(cur.trim().replace(/^["']|["']$/g, ''))
      return result
    }

    const headers = parseLine(lines[0])
    const rows = lines.slice(1).map(parseLine)

    return { headers, rows }
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    // Se for CSV ou texto
    if (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const { headers, rows } = parseCSV(text)
        if (headers.length === 0 || rows.length === 0) {
          toast({
            title: 'Arquivo sem dados válidos',
            description: 'Não foram encontradas linhas legíveis no arquivo.',
            variant: 'destructive',
          })
          return
        }
        setupHeadersAndGuessMapping(headers, rows)
      }
      reader.readAsText(file)
    } else {
      // XLSX/XLS: lê como texto se for XML Spreadsheet ou tenta parsing básico
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result
        if (typeof content === 'string') {
          const { headers, rows } = parseCSV(content)
          if (headers.length > 0 && rows.length > 0) {
            setupHeadersAndGuessMapping(headers, rows)
            return
          }
        }
        // Fallback: se não conseguir parsear binário puro sem libs externas, instrui salvar como CSV
        toast({
          title: 'Dica de Formato',
          description:
            'Para melhor compatibilidade instantânea, salve a planilha como CSV (.csv) e selecione-a.',
        })
      }
      reader.readAsText(file)
    }
  }

  const setupHeadersAndGuessMapping = (headers: string[], rows: string[][]) => {
    setRawHeaders(headers)
    setRawRows(rows)

    // Auto-detecta mapeamentos por nomes comuns
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase()
      const strIdx = String(idx)

      if (lower.includes('cia') || lower.includes('companhia') || lower.includes('airline')) {
        setColAirline(strIdx)
      } else if (
        lower.includes('categoria') ||
        lower.includes('tipo') ||
        lower.includes('descrição') ||
        lower.includes('descricao') ||
        lower.includes('item')
      ) {
        setColCategory(strIdx)
      } else if (
        lower.includes('budget') ||
        lower.includes('orçado') ||
        lower.includes('orcado') ||
        lower.includes('valor orcado') ||
        lower.includes('total orcado')
      ) {
        setColBudget(strIdx)
      } else if (
        lower.includes('utilizado') ||
        lower.includes('consumido') ||
        lower.includes('usado') ||
        lower.includes('gasto')
      ) {
        setColUsed(strIdx)
      } else if (lower.includes('moeda') || lower.includes('currency')) {
        setColCurrency(strIdx)
      } else if (
        lower.includes('período') ||
        lower.includes('periodo') ||
        lower.includes('mês') ||
        lower.includes('mes') ||
        lower.includes('ano') ||
        lower.includes('vigência')
      ) {
        setColPeriod(strIdx)
      } else if (
        lower.includes('unidade') ||
        lower.includes('núcleo') ||
        lower.includes('nucleo')
      ) {
        setColUnit(strIdx)
      }
    })

    setStep(2)
  }

  // Sanitizador numérico
  const parseAmount = (val: string): number => {
    if (!val) return 0
    let clean = val.replace(/R\$|\$|€/g, '').trim()
    // Trata 1.500,50 -> 1500.50
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.')
    }
    const num = parseFloat(clean)
    return isNaN(num) ? 0 : num
  }

  // Normalizador de cia
  const normalizeAirline = (val: string): string => {
    const lower = (val || '').toLowerCase().trim()
    if (lower.includes('latam') || lower.includes('la')) return 'latam'
    if (
      lower.includes('air france') ||
      lower.includes('klm') ||
      lower.includes('af') ||
      lower.includes('kl')
    )
      return 'afkl'
    if (lower.includes('gol') || lower.includes('g3')) return 'gol'
    if (lower.includes('american') || lower.includes('aa')) return 'aa'
    if (lower.includes('sky') || lower.includes('h2')) return 'sky'
    if (lower.includes('aeroporto') || lower.includes('assist')) return 'assistencia'
    return defaultAirline
  }

  // Normalizador de moeda
  const normalizeCurrency = (val: string): 'USD' | 'BRL' | 'EUR' => {
    const upper = (val || '').toUpperCase().trim()
    if (upper.includes('EUR') || upper.includes('€')) return 'EUR'
    if (upper.includes('BRL') || upper.includes('R$') || upper.includes('REAL')) return 'BRL'
    return 'USD'
  }

  // Prepara DTOs
  const mappedRows: CreateBudgetDTO[] = rawRows.slice(0, 100).map((row, idx) => {
    const rawCia = colAirline !== '' ? row[Number(colAirline)] : ''
    const rawCat = colCategory !== '' ? row[Number(colCategory)] : `Linha ${idx + 1}`
    const rawBud = colBudget !== '' ? row[Number(colBudget)] : '0'
    const rawUsed = colUsed !== '' ? row[Number(colUsed)] : '0'
    const rawCur = colCurrency !== '' ? row[Number(colCurrency)] : ''
    const rawPer = colPeriod !== '' ? row[Number(colPeriod)] : ''
    const rawUnit = colUnit !== '' ? row[Number(colUnit)] : ''

    const airline_key = rawCia ? normalizeAirline(rawCia) : defaultAirline
    const currency = rawCur ? normalizeCurrency(rawCur) : defaultCurrency
    const budget_amount = parseAmount(rawBud)
    const used_amount = parseAmount(rawUsed)
    const period_label = rawPer ? rawPer.trim() : defaultPeriod

    return {
      airline_key,
      category: rawCat || 'Geral',
      budget_amount,
      used_amount,
      currency,
      period_label,
      unit: rawUnit ? rawUnit.trim() : undefined,
      status: 'Ativo',
    }
  })

  const handleConfirmImport = async () => {
    if (mappedRows.length === 0) {
      toast({
        title: 'Nenhum dado para importar',
        description: 'Mapeie as colunas ou selecione outro arquivo.',
        variant: 'destructive',
      })
      return
    }

    setImporting(true)
    try {
      const result = await batchImportBudgets(mappedRows)

      if (result.successCount > 0) {
        toast({
          title: 'Importação concluída!',
          description: `${result.successCount} verba(s) orçamentária(s) importada(s) com sucesso.`,
        })
        onImportComplete()
        onOpenChange(false)
        resetState()
      } else {
        toast({
          title: 'Falha na importação',
          description: result.errors[0] || 'Nenhuma linha pôde ser gravada.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro na importação',
        description: err?.message || 'Ocorreu um erro ao gravar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Importação de Planilha de Verbas Comerciais
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Carregue arquivos CSV ou tabelas com as metas/orçamentos por companhia. Nenhum dado
                é pré-fixado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-xl p-8 text-center cursor-pointer transition-colors space-y-3"
            >
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Clique para selecionar sua planilha (CSV ou XLSX)
                </p>
                <p className="text-xs text-slate-500">
                  Suporta arquivos delimitados por vírgula ou ponto e vírgula (.csv).
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>

            {/* Guia de formato com exemplos fictícios genéricos */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <HelpCircle className="h-4 w-4 text-indigo-600" />
                Exemplo de Estrutura Esperada (Fictícia)
              </div>
              <p className="text-[11.5px] text-slate-500">
                Sua planilha pode conter colunas como: <code>Companhia</code>,{' '}
                <code>Categoria/Tipo</code>, <code>Valor Orçado</code>, <code>Utilizado</code>,{' '}
                <code>Moeda</code>, <code>Período</code>.
              </p>
              <div className="overflow-x-auto text-[11px] font-mono bg-white p-2 rounded border border-slate-200">
                <div className="text-slate-400"># Exemplo genérico:</div>
                <div>Companhia;Tipo;Orcado;Utilizado;Moeda;Periodo</div>
                <div className="text-slate-500">LATAM;Isenção Multa;10000;2500;USD;2026-03</div>
                <div className="text-slate-500">
                  Air France;Diferença de Tarifa;8000;1200;EUR;2026-03
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-600">
                Arquivo selecionado: <strong className="text-slate-900">{fileName}</strong> (
                {rawRows.length} linhas lidas)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="text-xs text-indigo-600 h-7"
              >
                Trocar arquivo
              </Button>
            </div>

            {/* Mapeador de Colunas */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Mapeamento de Colunas
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* Companhia */}
                <div className="space-y-1">
                  <Label className="text-xs">Coluna da Companhia</Label>
                  <Select value={colAirline} onValueChange={setColAirline}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="(Usar padrão)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Usar companhia padrão --</SelectItem>
                      {rawHeaders.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {colAirline === '' && (
                    <Select value={defaultAirline} onValueChange={setDefaultAirline}>
                      <SelectTrigger className="text-[11px] h-7 text-slate-600 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latam">LATAM Airlines</SelectItem>
                        <SelectItem value="afkl">Air France / KLM</SelectItem>
                        <SelectItem value="gol">GOL Linhas Aéreas</SelectItem>
                        <SelectItem value="aa">American Airlines</SelectItem>
                        <SelectItem value="sky">SKY Airline</SelectItem>
                        <SelectItem value="assistencia">Assistência Aeroportos</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <Label className="text-xs">Coluna do Tipo / Categoria *</Label>
                  <Select value={colCategory} onValueChange={setColCategory}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rawHeaders.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor Orçado */}
                <div className="space-y-1">
                  <Label className="text-xs">Coluna Valor Orçado (Budget) *</Label>
                  <Select value={colBudget} onValueChange={setColBudget}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rawHeaders.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Já Utilizado */}
                <div className="space-y-1">
                  <Label className="text-xs">Coluna Valor Já Utilizado (Opcional)</Label>
                  <Select value={colUsed} onValueChange={setColUsed}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="(Iniciar com 0)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Iniciar com 0 --</SelectItem>
                      {rawHeaders.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Moeda */}
                <div className="space-y-1">
                  <Label className="text-xs">Coluna Moeda</Label>
                  <Select value={colCurrency} onValueChange={setColCurrency}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="(Usar padrão)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Usar moeda padrão --</SelectItem>
                      {rawHeaders.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {colCurrency === '' && (
                    <Select
                      value={defaultCurrency}
                      onValueChange={(v) => setDefaultCurrency(v as any)}
                    >
                      <SelectTrigger className="text-[11px] h-7 text-slate-600 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD (Dólar)</SelectItem>
                        <SelectItem value="BRL">BRL (Real)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Período */}
                <div className="space-y-1">
                  <Label className="text-xs">Coluna Período / Vigência</Label>
                  <Select value={colPeriod} onValueChange={setColPeriod}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="(Usar padrão)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Usar período padrão --</SelectItem>
                      {rawHeaders.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {colPeriod === '' && (
                    <Input
                      value={defaultPeriod}
                      onChange={(e) => setDefaultPeriod(e.target.value)}
                      placeholder="Ex: Março/2026"
                      className="text-[11px] h-7 mt-1"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Pré-visualização dos Primeiros 5 Registros Mapeados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Table className="h-4 w-4 text-indigo-600" />
                  Pré-visualização do Mapeamento (Primeiras 5 linhas)
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Total: {mappedRows.length} registros mapeados
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <tr>
                      <th className="p-2">Companhia</th>
                      <th className="p-2">Tipo / Categoria</th>
                      <th className="p-2">Período</th>
                      <th className="p-2 text-right">Orçado</th>
                      <th className="p-2 text-right">Utilizado</th>
                      <th className="p-2">Moeda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {mappedRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 uppercase font-sans font-semibold text-slate-800">
                          {r.airline_key}
                        </td>
                        <td className="p-2 font-sans text-slate-700">{r.category}</td>
                        <td className="p-2 text-slate-600">{r.period_label}</td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {r.budget_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-amber-700">
                          {(r.used_amount || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2 text-slate-600">{r.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancelar
          </Button>

          {step === 2 && (
            <Button
              size="sm"
              onClick={handleConfirmImport}
              disabled={importing || mappedRows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {importing ? (
                'Importando...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirmar e Gravar {mappedRows.length}{' '}
                  Verba(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
