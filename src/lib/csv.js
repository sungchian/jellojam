// 共用 CSV 匯出工具，正確處理含逗號、雙引號、換行的欄位（RFC 4180）
function escapeCell(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * 產生並下載 CSV 檔（含 UTF-8 BOM，Excel 開啟中文不亂碼）
 * @param {string} filename
 * @param {Array<string>} header
 * @param {Array<Array>} rows
 */
export function downloadCsv(filename, header, rows) {
  const lines = [header, ...rows].map(r => r.map(escapeCell).join(','))
  const csv = lines.join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
