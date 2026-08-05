import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getFeedback, deleteFeedback } from '@/services/feedback'
import { FeedbackRecord } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { MessageSquare, Trash2, Bug, Lightbulb, Heart, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const CATEGORY_CONFIG: Record<string, { icon: typeof Bug; color: string }> = {
  Sugestão: { icon: Lightbulb, color: 'bg-blue-100 text-blue-700' },
  Bug: { icon: Bug, color: 'bg-rose-100 text-rose-700' },
  Elogio: { icon: Heart, color: 'bg-emerald-100 text-emerald-700' },
  Reclamação: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
}

export function FeedbackReviewPanel() {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([])
  const isMaster = user?.role === 'Master'

  const loadData = async () => {
    try {
      setFeedback(await getFeedback())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('feedback', () => loadData())

  const handleDelete = async (id: string) => {
    try {
      await deleteFeedback(id)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const stats = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key,
    ...config,
    count: feedback.filter((f) => f.category === key).length,
  }))

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-600" /> Revisão de Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.key} className={`rounded-lg p-2.5 ${s.color}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">{s.key}</span>
                </div>
                <p className="text-xl font-black mt-1">{s.count}</p>
              </div>
            )
          })}
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {feedback.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum feedback recebido.</p>
          )}
          {feedback.map((f) => {
            const config = CATEGORY_CONFIG[f.category] || CATEGORY_CONFIG['Sugestão']
            const Icon = config.icon
            return (
              <div key={f.id} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg group">
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {f.category}
                    </Badge>
                    <span className="text-[10px] text-slate-400">
                      {f.expand?.user_id?.name || 'Anônimo'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {f.created ? format(new Date(f.created), 'dd/MM/yyyy', { locale: ptBR }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">{f.message}</p>
                </div>
                {isMaster && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(f.id)}
                  >
                    <Trash2 className="h-3 w-3 text-slate-400" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
