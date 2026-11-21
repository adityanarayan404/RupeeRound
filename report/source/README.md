# Report source

Everything needed to rebuild `../RupeeRound-Project-Report.docx` and `.pdf`.

| File | What it is |
|---|---|
| `build-report.js` | All report text, tables and layout. Edit this to change the report |
| `finalize.ps1` | Opens the .docx in Microsoft Word, fills the table of contents, saves, exports the PDF |
| `arch.html` / `arch.png` | Figure 4.1, system architecture (PNG rendered from the HTML) |
| `flow.html` / `flow.png` | Figure 4.2, round-up and investment flow |
| `screens.png` | Figure 5.1, the four app screenshots combined |

## Rebuild

Needs Node.js and Microsoft Word. Run from this folder in PowerShell:

```powershell
pnpm install --ignore-workspace          # first time only: installs the docx library here
node build-report.js "..\RupeeRound-Project-Report.docx"
powershell -ExecutionPolicy Bypass -File .\finalize.ps1 -Docx "$PWD\..\RupeeRound-Project-Report.docx" -Pdf "$PWD\..\RupeeRound-Project-Report.pdf"
```

Rebuilding overwrites the .docx. If you edited the Word file by hand, copy those edits into `build-report.js` first, or they will be lost.

## Re-render a diagram

After editing `arch.html` or `flow.html`:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=1600,740 "--screenshot=$PWD\arch.png" "file:///$($PWD -replace '\\','/')/arch.html"
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=1600,560 "--screenshot=$PWD\flow.png" "file:///$($PWD -replace '\\','/')/flow.html"
```
