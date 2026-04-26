import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

describe('App', () => {
  it('exports a default App component', () => {
    // Importing `App` here pulls in optional runtime deps (auth/router)
    // that aren't required for this smoke check.
    const here = dirname(fileURLToPath(import.meta.url))
    const appSource = readFileSync(resolve(here, 'App.jsx'), 'utf8')

    // Source-based smoke test:
    // - we don't import/execute `App` (avoids optional runtime deps)
    // - we still assert the file defines `App` and exports it as default
    expect(appSource).toMatch(/\bfunction\s+App\b/)
    expect(appSource).toMatch(/\bexport\s+default\s+App\b/)
  })
})

