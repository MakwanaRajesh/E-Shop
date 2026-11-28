import type { Order } from '@/types'
import { formatDate } from '@/lib/utils'

function sanitizePdfText(raw: string): string {
  return raw
    .replace(/₹/g, 'Rs. ')
    .replace(/[•·]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pdfEscape(raw: string): string {
  const safe = sanitizePdfText(raw)
  return safe.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function formatInrPlain(amount: number): string {
  return `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = sanitizePdfText(text)
  if (!clean) return ['']
  const words = clean.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim()
    } else {
      if (cur) lines.push(cur)
      cur = w.length > maxChars ? w.slice(0, maxChars - 3) + '...' : w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/**
 * Generates an A4 binary PDF (PDF 1.4) Tax Invoice document for any NEXUS order.
 * Pure client-side implementation with mathematically computed byte-offset xref table.
 */
export function generateTaxInvoicePdfBlob(order: Order): Blob {
  // A4 dimensions in PostScript points: 595 x 842
  const cmds: string[] = []
  const addText = (
    x: number,
    y: number,
    text: string,
    opts?: { bold?: boolean; size?: number; color?: [number, number, number] },
  ) => {
    const font = opts?.bold ? 'F2' : 'F1'
    const size = opts?.size ?? 10
    const [r, g, b] = opts?.color ?? [0.07, 0.07, 0.07]
    cmds.push('BT')
    cmds.push(`/${font} ${size} Tf`)
    cmds.push(`${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg`)
    cmds.push(`1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm`)
    cmds.push(`(${pdfEscape(text)}) Tj`)
    cmds.push('ET')
  }

  const addLine = (x1: number, y1: number, x2: number, y2: number, width = 0.8, rgb: [number, number, number] = [0.85, 0.83, 0.8]) => {
    cmds.push(`${width.toFixed(2)} w`)
    cmds.push(`${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} RG`)
    cmds.push(`${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`)
  }

  const addRectFill = (x: number, y: number, w: number, h: number, rgb: [number, number, number]) => {
    cmds.push(`${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} rg`)
    cmds.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`)
  }

  const addRectStroke = (x: number, y: number, w: number, h: number, rgb: [number, number, number] = [0.88, 0.86, 0.83]) => {
    cmds.push('0.75 w')
    cmds.push(`${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} RG`)
    cmds.push(`${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`)
  }

  // Gold top accent rule
  addRectFill(40, 804, 515, 3, [0.77, 0.63, 0.35])

  // Header
  addText(40, 778, 'NEXUS LUXURY ATELIER', { bold: true, size: 19, color: [0.07, 0.07, 0.07] })
  addText(40, 762, 'High-End Couture, Horology & Fine Living', { size: 9, color: [0.45, 0.43, 0.4] })
  addText(40, 746, '2 Maruti Chock, Rajkot, Gujarat, 360005, India', { size: 9, color: [0.25, 0.24, 0.22] })
  addText(40, 733, 'Email: nexustech1003@gmail.com | Helpline: +91 12345 67890', { size: 9, color: [0.25, 0.24, 0.22] })
  addText(40, 720, 'GSTIN: 24AAACN1234F1Z5 - CIN: U74999GJ2026PTC109842', { bold: true, size: 8.5, color: [0.6, 0.46, 0.19] })

  addRectFill(385, 768, 170, 22, [0.98, 0.96, 0.91])
  addRectStroke(385, 768, 170, 22, [0.77, 0.63, 0.35])
  addText(394, 775.5, 'TAX INVOICE / BILL OF SUPPLY', { bold: true, size: 9, color: [0.55, 0.42, 0.16] })

  addText(385, 750, `Invoice #: INV-${order.orderNumber}`, { bold: true, size: 9.5 })
  addText(385, 736, `Order Date: ${formatDate(order.createdAt)}`, { size: 9, color: [0.3, 0.29, 0.27] })
  addText(385, 722, 'Place of Supply: Gujarat (24)', { size: 9, color: [0.3, 0.29, 0.27] })

  addLine(40, 706, 555, 706, 1.2, [0.77, 0.63, 0.35])

  // Billed To & Logistics Boxes
  addRectFill(40, 598, 250, 96, [0.98, 0.97, 0.95])
  addRectStroke(40, 598, 250, 96)
  addText(52, 678, 'BILLED & SHIPPED TO', { bold: true, size: 8, color: [0.6, 0.46, 0.19] })
  addText(52, 661, order.shippingName || 'Client', { bold: true, size: 10.5 })
  const addr1 = `${order.shippingAddressLine1 ?? ''}${order.shippingAddressLine2 ? ', ' + order.shippingAddressLine2 : ''}`
  const addrLines = wrapText(addr1, 42)
  addText(52, 646, addrLines[0] ?? '', { size: 8.5, color: [0.32, 0.3, 0.28] })
  if (addrLines[1]) {
    addText(52, 634, addrLines[1], { size: 8.5, color: [0.32, 0.3, 0.28] })
    addText(52, 622, `${order.shippingCity ?? ''}, ${order.shippingState ?? ''} - ${order.shippingPinCode ?? ''}`, { size: 8.5, color: [0.32, 0.3, 0.28] })
  } else {
    addText(52, 634, `${order.shippingCity ?? ''}, ${order.shippingState ?? ''} - ${order.shippingPinCode ?? ''}`, { size: 8.5, color: [0.32, 0.3, 0.28] })
  }
  addText(52, 608, `Mobile: ${order.shippingPhone ?? ''}`, { bold: true, size: 8.5 })

  addRectFill(305, 598, 250, 96, [0.98, 0.97, 0.95])
  addRectStroke(305, 598, 250, 96)
  addText(317, 678, 'PAYMENT & LOGISTICS INFO', { bold: true, size: 8, color: [0.6, 0.46, 0.19] })
  addText(317, 660, `Order #: ${order.orderNumber}`, { size: 9, bold: true })
  addText(317, 645, `Payment Mode: ${String(order.paymentMethod ?? '')}`, { size: 9 })
  addText(317, 630, `Payment Status: ${String(order.paymentStatus ?? '')}`, { size: 9, bold: true, color: [0.05, 0.5, 0.32] })
  addText(317, 615, `Tracking: ${order.trackingNumber || 'Pending Courier Dispatch'}`, { size: 8.5, color: [0.35, 0.33, 0.3] })

  // Table header
  let curY = 562
  addRectFill(40, curY, 515, 22, [0.95, 0.94, 0.91])
  addRectStroke(40, curY, 515, 22, [0.83, 0.81, 0.78])
  addText(48, curY + 7, '#', { bold: true, size: 8, color: [0.35, 0.33, 0.3] })
  addText(72, curY + 7, 'ITEM DESCRIPTION', { bold: true, size: 8, color: [0.35, 0.33, 0.3] })
  addText(285, curY + 7, 'HSN', { bold: true, size: 8, color: [0.35, 0.33, 0.3] })
  addText(335, curY + 7, 'QTY', { bold: true, size: 8, color: [0.35, 0.33, 0.3] })
  addText(375, curY + 7, 'UNIT RATE', { bold: true, size: 8, color: [0.35, 0.33, 0.3] })
  addText(440, curY + 7, 'GST (18%)', { bold: true, size: 8, color: [0.35, 0.33, 0.3] })
  addText(502, curY + 7, 'TOTAL', { bold: true, size: 8, color: [0.35, 0.33, 0.3] })

  curY -= 22
  const items = order.items ?? []
  items.slice(0, 12).forEach((item, idx) => {
    const netRate = item.unitPrice / 1.18
    const gstAmt = (item.unitPrice - netRate) * item.quantity
    const nameLines = wrapText(item.productName || 'Luxury Piece', 34)

    addText(48, curY + 4, String(idx + 1), { size: 9, color: [0.4, 0.38, 0.35] })
    addText(72, curY + 4, nameLines[0], { bold: true, size: 9 })
    if (nameLines[1]) {
      addText(72, curY - 7, nameLines[1], { size: 8, color: [0.4, 0.38, 0.35] })
    }
    addText(285, curY + 4, '6205', { size: 8.5, color: [0.4, 0.38, 0.35] })
    addText(340, curY + 4, String(item.quantity), { bold: true, size: 9 })
    addText(375, curY + 4, formatInrPlain(netRate), { size: 8.5 })
    addText(440, curY + 4, formatInrPlain(gstAmt), { size: 8.5, color: [0.4, 0.38, 0.35] })
    addText(502, curY + 4, formatInrPlain(item.totalPrice), { bold: true, size: 9 })

    const rowHeight = nameLines[1] ? 28 : 22
    addLine(40, curY - (rowHeight - 16), 555, curY - (rowHeight - 16), 0.5, [0.9, 0.89, 0.87])
    curY -= rowHeight
  })

  if (items.length > 12) {
    addText(72, curY, `+ ${items.length - 12} additional item(s) on order`, { size: 8.5, color: [0.45, 0.43, 0.4] })
    curY -= 18
  }

  // Totals Summary Box
  curY = Math.min(curY - 12, 340)
  const total = order.totalAmount ?? order.total ?? 0
  const taxable = total / 1.18
  const cgst = (total * 0.09) / 1.18
  const sgst = (total * 0.09) / 1.18
  const shipText = (order.shippingCost ?? 0) === 0 ? 'FREE' : formatInrPlain(order.shippingCost ?? 0)

  const summaryRows: Array<[string, string, boolean?]> = [
    ['Taxable Subtotal:', formatInrPlain(taxable)],
    ['CGST (9.0%):', formatInrPlain(cgst)],
    ['SGST (9.0%):', formatInrPlain(sgst)],
    ['Doorstep Delivery:', shipText],
    ['Platform Fee:', formatInrPlain(order.platformFee ?? 0)],
  ]

  summaryRows.forEach(([label, val]) => {
    addText(335, curY, label, { size: 9, color: [0.4, 0.38, 0.35] })
    addText(465, curY, val, { size: 9, bold: true })
    curY -= 16
  })

  addLine(335, curY + 6, 555, curY + 6, 1.2, [0.07, 0.07, 0.07])
  addText(335, curY - 10, 'Total Invoice Value:', { bold: true, size: 11 })
  addText(465, curY - 10, formatInrPlain(total), { bold: true, size: 11.5, color: [0.55, 0.42, 0.16] })

  // Footer
  addLine(40, 72, 555, 72, 0.6, [0.85, 0.83, 0.8])
  addText(
    40,
    54,
    'Computer generated tax invoice issued by NEXUS E-Commerce Retail Pvt. Ltd. No physical signature required.',
    { size: 8, color: [0.45, 0.43, 0.4] },
  )
  addText(420, 40, 'For NEXUS LUXURY ATELIER', { bold: true, size: 8.5, color: [0.15, 0.14, 0.13] })

  // Assemble PDF 1.4 objects cleanly with exact UTF-8 byte offsets
  const contentStream = cmds.join('\n')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${new TextEncoder().encode(contentStream).length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ]

  const encoder = new TextEncoder()
  const header = '%PDF-1.4\n'
  let offset = encoder.encode(header).length
  const offsets: number[] = []
  let body = header

  for (const obj of objects) {
    offsets.push(offset)
    body += obj
    offset += encoder.encode(obj).length
  }

  const xrefStart = offset
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \n`
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  const fullPdf = body + xref + trailer

  return new Blob([encoder.encode(fullPdf)], { type: 'application/pdf' })
}
