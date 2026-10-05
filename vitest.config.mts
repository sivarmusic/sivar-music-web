import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// JSX vía esbuild (runtime automático) en vez de @vitejs/plugin-react: la
// versión instalada (1.3.2) es incompatible con Vite 6 y tira "can't detect
// preamble" al importar cualquier .tsx. Los tests no necesitan Fast Refresh.
export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
  },
})
