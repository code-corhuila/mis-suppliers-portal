import { build, stop } from 'esbuild-wasm';
try {
  await build({ entryPoints: ['src/portal.jsx'], bundle: true, platform: 'browser', format: 'esm', target: ['es2022'], outfile: 'dist/portal.js', minify: true, jsx: 'automatic', loader: { '.css': 'text' }, define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'eof' });
} finally { stop(); }
