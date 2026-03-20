const env = process.env;

export default () => ({
  port: parseInt(env.PORT, 10) || 3000,
  database: {
    host: env.DATABASE_HOST,
    port: parseInt(env.DATABASE_PORT, 10) || 5432,
  },
});