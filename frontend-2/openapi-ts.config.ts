export default {
  input: 'http://localhost:8000/api/v1/schema/',
  output: 'src/client',
  plugins: [
    '@hey-api/client-next',
    '@tanstack/react-query',
    'zod', 
    {
      dates: true, 
      name: '@hey-api/transformers',
    }
  ],
};
