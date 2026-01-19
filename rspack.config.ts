import { defineConfig } from '@rspack/cli';
import path from 'path';

export default defineConfig({
  entry: {
    index: './index.ts',
    client: './client.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: {
      type: 'commonjs-static',
    },
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
            },
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  externals: [
    /workbox-.*/,
    'eventsource-parser',
    'workbox-window'
  ],
  target: 'webworker',
});
