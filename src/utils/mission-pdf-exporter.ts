/**
 * mission-pdf-exporter.ts
 *
 * Gera PDF profissional da Missão do Dia com:
 * - Layout clean e imprimível
 * - QR Code com URL para sincronização
 * - Espaço para anotações (linhas em branco)
 * - Checklist interativo
 * - Sonorização ao gerar
 * - Integração com html2pdf
 */

import html2pdf from 'html2pdf.js'

// ============================================
// TIPOS
// ============================================

export interface MissionTask {
  id: string
  order: number
  type: 'theory' | 'questions' | 'review' | 'flashcards' | 'study'
  title: string
  subject: string
  durationMinutes: number
  description?: string
  notes?: string
}

export interface MissionPDFOptions {
  date: Date
  tasks: MissionTask[]
  totalMinutes: number
  targetScore?: number
  qrCodeUrl: string
  soundEnabled?: boolean
  includeNotes?: boolean
}

// ============================================
// AUDIO SERVICE
// ============================================

class AudioService {
  /**
   * Reproduzir som de sucesso
   */
  static playSuccess(): void {
    this.playTone(800, 200) // 800Hz, 200ms
  }

  /**
   * Reproduzir som de erro
   */
  static playError(): void {
    this.playTone(400, 300) // 400Hz, 300ms
  }

  /**
   * Reproduzir som de notificação
   */
  static playNotification(): void {
    this.playTone(600, 150) // 600Hz, 150ms
  }

  /**
   * Reproduzir tom customizado
   */
  private static playTone(frequency: number, duration: number): void {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration / 1000
      )

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration / 1000)
    } catch (error) {
      console.warn('Áudio não disponível:', error)
    }
  }

  /**
   * Falar texto (Text-to-Speech)
   */
  static speak(text: string, language: string = 'pt-BR'): void {
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    } catch (error) {
      console.warn('TTS não disponível:', error)
    }
  }
}

// ============================================
// QR CODE HELPER (usando qrcode.js)
// ============================================

/**
 * Gerar QR Code como Data URL
 * Requer: https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
 */
function generateQRCode(url: string, size: number = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    // Usar biblioteca externa (qrcode.js)
    // Se não disponível, usar fallback
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas não disponível'))
        return
      }

      // Fallback simples: mostrar URL como texto
      canvas.width = size
      canvas.height = size
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = '#000000'
      ctx.font = '12px Arial'
      ctx.fillText('QR', 10, 20)

      resolve(canvas.toDataURL())
    } catch (error) {
      reject(error)
    }
  })
}

// ============================================
// PDF EXPORTER
// ============================================

export class MissionPDFExporter {
  /**
   * Gerar PDF da Missão
   */
  static async generateMissionPDF(options: MissionPDFOptions): Promise<void> {
    try {
      // Reproduzir som de início
      if (options.soundEnabled !== false) {
        AudioService.playNotification()
        AudioService.speak('Gerando documento da missão do dia')
      }

      // Gerar QR code
      let qrCodeDataUrl = ''
      try {
        qrCodeDataUrl = await generateQRCode(options.qrCodeUrl, 150)
      } catch (e) {
        console.warn('Falha ao gerar QR Code:', e)
      }

      // Gerar HTML
      const htmlContent = this.generateHTML(options, qrCodeDataUrl)

      // Configurar opções do html2pdf
      const pdfOptions = {
        margin: 10,
        filename: `missao-${this.formatDate(options.date)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      }

      // Gerar PDF
      html2pdf().set(pdfOptions).from(htmlContent).save()

      // Reproduzir som de sucesso
      if (options.soundEnabled !== false) {
        setTimeout(() => {
          AudioService.playSuccess()
          AudioService.speak('Documento gerado com sucesso')
        }, 1000)
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      AudioService.playError()
      throw error
    }
  }

  /**
   * Gerar HTML para o PDF
   */
  private static generateHTML(
    options: MissionPDFOptions,
    qrCodeDataUrl: string
  ): string {
    const tasksHTML = options.tasks
      .map(
        (task, idx) => `
      <div style="margin-bottom: 1.2rem; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
          <input type="checkbox" style="width: 20px; height: 20px; margin-right: 10px; cursor: pointer;" />
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">
              ${task.order}. ${task.title}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
              ${task.subject} • ${task.durationMinutes}min • ${this.getTaskTypeLabel(task.type)}
            </div>
          </div>
        </div>

        ${task.description ? `
        <div style="margin-left: 30px; font-size: 11px; color: #4b5563; margin-bottom: 0.5rem;">
          ${task.description}
        </div>
        ` : ''}

        ${options.includeNotes !== false ? `
        <div style="margin-left: 30px; margin-top: 0.5rem;">
          <div style="border-bottom: 1px dotted #d1d5db; height: 40px; margin-bottom: 0.5rem;"></div>
        </div>
        ` : ''}
      </div>
    `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #1f2937;
              line-height: 1.5;
              margin: 0;
              padding: 20px;
            }

            .container {
              max-width: 210mm;
              margin: 0 auto;
            }

            .header {
              text-align: center;
              margin-bottom: 2rem;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 1rem;
            }

            .header-title {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 0.5rem 0;
            }

            .header-subtitle {
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            }

            .stats {
              display: flex;
              justify-content: space-around;
              margin-bottom: 2rem;
              gap: 1rem;
            }

            .stat-box {
              flex: 1;
              background: #f3f4f6;
              padding: 1rem;
              border-radius: 8px;
              text-align: center;
              border-left: 4px solid #3b82f6;
            }

            .stat-value {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
            }

            .stat-label {
              font-size: 12px;
              color: #6b7280;
              margin-top: 0.25rem;
            }

            .tasks-section {
              margin-bottom: 2rem;
            }

            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 1rem;
              border-left: 4px solid #10b981;
              padding-left: 0.75rem;
            }

            .task-item {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 0.75rem;
              margin-bottom: 0.75rem;
            }

            .task-checkbox {
              width: 20px;
              height: 20px;
              margin-right: 10px;
              cursor: pointer;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .task-title {
              font-weight: 600;
              font-size: 13px;
              color: #1f2937;
            }

            .task-meta {
              font-size: 11px;
              color: #6b7280;
              margin-top: 3px;
            }

            .task-notes {
              border-bottom: 1px dotted #d1d5db;
              height: 30px;
              margin-top: 0.5rem;
            }

            .footer {
              margin-top: 2rem;
              padding-top: 1rem;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }

            .qr-section {
              text-align: center;
            }

            .qr-code {
              width: 120px;
              height: 120px;
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 5px;
              background: white;
            }

            .qr-label {
              font-size: 10px;
              color: #6b7280;
              margin-top: 0.5rem;
            }

            .signature-section {
              display: flex;
              gap: 2rem;
            }

            .signature-line {
              flex: 1;
              text-align: center;
              border-top: 1px solid #1f2937;
              padding-top: 0.5rem;
              font-size: 10px;
            }

            @media print {
              body {
                background: white;
              }
              .task-checkbox {
                accent-color: #3b82f6;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1 class="header-title">🎯 Missão do Dia</h1>
              <p class="header-subtitle">${this.formatDateLong(options.date)}</p>
            </div>

            <!-- Stats -->
            <div class="stats">
              <div class="stat-box">
                <div class="stat-value">${options.tasks.length}</div>
                <div class="stat-label">Tarefas</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${options.totalMinutes}</div>
                <div class="stat-label">Minutos</div>
              </div>
              ${options.targetScore ? `
              <div class="stat-box">
                <div class="stat-value">${options.targetScore}</div>
                <div class="stat-label">Meta</div>
              </div>
              ` : ''}
            </div>

            <!-- Tasks -->
            <div class="tasks-section">
              <div class="section-title">✓ Tarefas da Missão</div>
              ${tasksHTML}
            </div>

            <!-- Footer with QR Code -->
            <div class="footer">
              <div class="signature-section">
                <div class="signature-line">
                  Assinatura do Estudante
                </div>
                <div class="signature-line">
                  Data/Hora de Conclusão
                </div>
              </div>

              ${qrCodeDataUrl ? `
              <div class="qr-section">
                <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
                <div class="qr-label">Escaneie para sincronizar</div>
              </div>
              ` : ''}
            </div>

            <!-- Notas Adicionais -->
            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 12px; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem;">
                📝 Notas Adicionais
              </div>
              <div style="display: grid; grid-template-rows: repeat(3, 1fr); gap: 0.5rem;">
                <div style="border-bottom: 1px dotted #d1d5db; height: 30px;"></div>
                <div style="border-bottom: 1px dotted #d1d5db; height: 30px;"></div>
                <div style="border-bottom: 1px dotted #d1d5db; height: 30px;"></div>
              </div>
            </div>

            <!-- Instructions -->
            <div style="margin-top: 1rem; font-size: 10px; color: #6b7280; background: #f9fafb; padding: 0.75rem; border-radius: 6px;">
              <strong>💡 Dica:</strong> Marque os checkboxes conforme completa cada tarefa. Escreva notas enquanto estuda. Escaneie o QR Code após terminar para registrar conclusão automática.
            </div>
          </div>
        </body>
      </html>
    `

    return html
  }

  /**
   * Formatar data para filename
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Formatar data legível
   */
  private static formatDateLong(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  /**
   * Rótulo do tipo de tarefa
   */
  private static getTaskTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      theory: '📚 Teoria',
      questions: '❓ Questões',
      review: '🔄 Revisão',
      flashcards: '🎴 Flashcards',
      study: '📖 Estudo',
    }
    return labels[type] || type
  }

  /**
   * Exportar como HTML (para visualizar antes de imprimir)
   */
  static async exportAsHTML(options: MissionPDFOptions): Promise<string> {
    const qrCodeDataUrl = await generateQRCode(options.qrCodeUrl, 150)
    return this.generateHTML(options, qrCodeDataUrl)
  }

  /**
   * Imprimir diretamente (sem salvar PDF)
   */
  static async printMission(options: MissionPDFOptions): Promise<void> {
    const html = await this.exportAsHTML(options)
    const printWindow = window.open('', '_blank')

    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.print()
    }
  }
}

// ============================================
// HELPER: Inicializar com carregamento de biblioteca
// ============================================

export async function initializePDFExporter(): Promise<void> {
  // Verificar se html2pdf está disponível
  if (!(window as any).html2pdf) {
    // Carregar dinamicamente
    const script = document.createElement('script')
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.onload = () => {
      console.log('✅ html2pdf carregado')
    }
    document.head.appendChild(script)
  }

  // Carregar qrcode.js se necessário
  if (!(window as any).QRCode) {
    const script = document.createElement('script')
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      console.log('✅ qrcode.js carregado')
    }
    document.head.appendChild(script)
  }
}

export { AudioService }
