const env = process.env;

export default () => ({
  port: env.PORT ? parseInt(env.PORT, 10) : 3000,
  database: {
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT ? parseInt(env.DATABASE_PORT, 10) : 5432,
  },
  corsOrigins: (env.CORS_ORIGINS ?? 'https://localhost:4200').split(','),
});