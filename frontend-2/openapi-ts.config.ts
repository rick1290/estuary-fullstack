export default {
  input: 'http://localhost:8000/api/v1/schema/',
  output: 'src/client',
  plugins: [
    {
      name: '@hey-api/client-next',
      runtimeConfigPath: './src/hey-api.ts',
    },
    '@tanstack/react-query',
    'zod', 
    {
      dates: true, 
      name: '@hey-api/transformers',
    }
  ],
};
