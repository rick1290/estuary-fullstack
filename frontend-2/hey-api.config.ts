import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:8000/api/v1/schema/',
  output: 'src/client',
  plugins: [
    '@hey-api/client-next',
    {
      name: '@hey-api/types',
      dates: true,
    },
    {
      name: '@tanstack/react-query',
      experimentalParser: true,
    },
    {
      name: '@hey-api/transformers',
      dates: true,
    },
  ],
});