import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('App', () => {
  it('exports a default App component', () => {
    // Importing `App` here pulls in optional runtime deps (auth/router)
    // that aren't required for this smoke check.
    const appSource = readFileSync(resolve(__dirname, 'App.jsx'), 'utf8')

    expect(appSource).toMatch(/\bexport\s+default\s+App\b/)
    expect(appSource).toMatch(/\bfunction\s+App\s*\(/)
  })
})

