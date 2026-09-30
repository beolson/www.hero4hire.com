import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: Number(process.env.PORT ?? 3100), host: '0.0.0.0' },
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { exclude: ['@dbos-inc/dbos-sdk', 'pg'] },
  ssr: { external: ['@dbos-inc/dbos-sdk', 'pg'] },
  plugins: [tanstackStart(), react()],
})
