import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// import commonjs from 'rollup-plugin-commonjs'
import requireTransform from 'vite-plugin-require-transform'

// https://vitejs.dev/config/
export default ({ mode }) => {
  // const env = loadEnv(mode, process.cwd(), '')

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
