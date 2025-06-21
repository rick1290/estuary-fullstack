export default {
  input: process.env.OPENAPI_CONFIG_ENV === 'production' 
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/v1/schema/'
    : 'http://localhost:8000/api/v1/schema/',
  output: 'src/client',
  plugins: [
    {
      name: '@hey-api/client-next',
      runtimeConfigPath: './src/hey-api-nextauth.ts',
    },
    '@tanstack/react-query',
    'zod', 
    {
      dates: true, 
      name: '@hey-api/transformers',
    }
  ],
};
