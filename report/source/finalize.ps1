# Opens the generated report in Word, fills the table of contents, saves it and exports a PDF.
param([string]$Docx, [string]$Pdf)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($Docx)
  $doc.Repaginate()
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Fields.Update() | Out-Null
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Save()
  $doc.ExportAsFixedFormat($Pdf, 17)   # 17 = wdExportFormatPDF
  "pages: " + $doc.ComputeStatistics(2) # 2 = wdStatisticPages
  $doc.Close($false)
} finally {
  $word.Quit()
}
