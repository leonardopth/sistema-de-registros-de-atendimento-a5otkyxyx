import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getCsatPublicByToken, submitCsatResponse, CsatRecordResponse } from '@/services/csat'
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Loader2,
} from 'lucide-react'

export default function PublicCsat() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<CsatRecordResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Seleções do formulário
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Link de avaliação inválido ou não informado.')
      setLoading(false)
      return
    }

    getCsatPublicByToken(token)
      .then((res) => {
        setData(res)
        if (res.already_responded) {
          setSelectedRating(res.current_rating || 5)
        }
      })
      .catch((err) => {
        setError(
          'Não foi possível carregar a pesquisa de satisfação. O link pode ser inválido ou expirado.',
        )
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!token) return
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      setError('Por favor, selecione uma nota de 1 a 5 ou clique em Positivo/Negativo.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await submitCsatResponse(token, selectedRating, comment)
      setSuccessMessage(
        res.message || 'Avaliação registrada com sucesso! Muito obrigado pelo feedback.',
      )
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar sua avaliação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Atalhos rápidos Positivo (5) / Negativo (1)
  const handleQuickRating = (rating: number) => {
    setSelectedRating(rating)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Logotipo / Nome do Sistema */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Central de Atendimento
          </h1>
          <p className="text-xs text-slate-500 font-medium">Pesquisa de Satisfação (CSAT)</p>
        </div>
      </div>

      <div className="w-full max-w-lg">
        {loading ? (
          <Card className="p-8 text-center bg-white shadow-xl border-slate-200">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Carregando pesquisa...</p>
          </Card>
        ) : error && !data ? (
          <Card className="bg-white shadow-xl border-rose-200">
            <CardHeader className="text-center pb-4">
              <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg text-slate-900 font-bold">Link Indisponível</CardTitle>
              <CardDescription className="text-xs text-slate-600 mt-1">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : successMessage || data?.already_responded ? (
          <Card className="bg-white shadow-xl border-emerald-200">
            <CardHeader className="text-center pb-4">
              <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl text-slate-900 font-bold">
                {successMessage ? 'Obrigado pelo seu feedback!' : 'Atendimento Já Avaliado'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 max-w-sm mx-auto mt-2">
                {successMessage ||
                  `Esta avaliação já foi registrada com nota ${data?.current_rating} de 5 estrelas. Agradecemos por nos ajudar a melhorar continuamente.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100 max-w-xs mx-auto">
                Chamado #{data?.service_id?.substring(0, 8)} •{' '}
                {data?.contact_reason || 'Atendimento'}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white shadow-xl border-slate-200 overflow-hidden">
            <CardHeader className="text-center pb-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-900">
                Como foi seu atendimento?
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                Olá {data?.client_name ? <strong>{data.client_name}</strong> : ''}, conte-nos sua
                experiência para avaliarmos a qualidade da resolução.
              </CardDescription>
              {data?.contact_reason && (
                <div className="inline-block px-2.5 py-1 mt-2 text-[11px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 mx-auto">
                  Motivo: {data.contact_reason}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Botões Grandes 👍 / 👎 */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
                  Avaliação Rápida
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickRating(5)}
                    className={`h-20 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 border-2 ${
                      selectedRating === 5
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                    }`}
                  >
                    <ThumbsUp
                      className={`h-6 w-6 ${selectedRating === 5 ? 'text-emerald-600 scale-110' : 'text-slate-500'}`}
                    />
                    <span className="text-xs font-bold">Atendimento Bom 👍</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuickRating(1)}
                    className={`h-20 flex flex-col items-center justify-center gap-1.5 transition-all duration-150 border-2 ${
                      selectedRating === 1
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                        : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
                    }`}
                  >
                    <ThumbsDown
                      className={`h-6 w-6 ${selectedRating === 1 ? 'text-rose-600 scale-110' : 'text-slate-500'}`}
                    />
                    <span className="text-xs font-bold">Precisa Melhorar 👎</span>
                  </Button>
                </div>
              </div>

              {/* Escala Detalhada 1 a 5 estrelas */}
              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-2.5">
                  Ou selecione uma nota de 1 a 5 estrelas
                </p>
                <div className="flex justify-center items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = selectedRating !== null && selectedRating >= star
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-transform active:scale-90 group focus:outline-none"
                        title={`${star} estrela(s)`}
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            isSelected
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 group-hover:text-amber-300'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                {selectedRating !== null && (
                  <p className="text-center text-xs font-medium text-slate-600 mt-1.5">
                    Nota selecionada:{' '}
                    <span className="font-bold text-slate-800">{selectedRating} de 5</span>
                  </p>
                )}
              </div>

              {/* Comentário Opcional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Comentário adicional (opcional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Gostaria de deixar algum elogio, observação ou sugestão de melhoria?"
                  className="text-xs min-h-[85px] resize-none"
                  maxLength={500}
                />
              </div>

              {/* Ação de envio */}
              <Button
                onClick={() => handleSubmit()}
                disabled={submitting || selectedRating === null}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Enviar Avaliação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rodapé institucional */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Sistema de Atendimento. Todas as avaliações são sigilosas e
        usadas para controle de qualidade.
      </footer>
    </div>
  )
}
