import { createApp } from './app.ts'
import { config } from './config.ts'
import { connectDb } from './db.ts'
import { ensureFunds, refreshStaleFunds } from './services/funds.ts'

await connectDb()
await ensureFunds()
// Warm the NAV cache in the background; requests fall back to saved NAVs meanwhile.
void refreshStaleFunds()

createApp().listen(config.port, () => {
  console.log(`RupeeRound API listening on http://localhost:${config.port}`)
})
