import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportMenuProps {
  onCSV: () => void
  onExcel: () => void
  onPDF: () => void
  label?: string
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm'
  className?: string
}

export function ExportMenu({
  onCSV,
  onExcel,
  onPDF,
  label = 'Exportar',
  variant = 'outline',
  size = 'sm',
  className,
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={cn('text-xs font-semibold', className)}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs">Formatos de Exportação</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCSV} className="text-xs cursor-pointer">
          <FileText className="h-3.5 w-3.5 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExcel} className="text-xs cursor-pointer">
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPDF} className="text-xs cursor-pointer">
          <FileType className="h-3.5 w-3.5 mr-2" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
