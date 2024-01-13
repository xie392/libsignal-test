import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import requireTransform from 'vite-plugin-require-transform'

// https://vitejs.dev/config/
export default () => {

  return defineConfig({
    plugins: [
      react(),
      requireTransform({
        fileRegex: /.js$|.vue$|.ts$|.tsx$/,
      }),
    ],
    define: {
      // 'process': true
      'process.env': {}
    },
  })
}
