import { Config } from 'effect';

export const ServerConfig = Config.all({
  port: Config.Port('PORT').pipe(Config.withDefault(3000)),
  corsOrigins: Config.String('CORS_ORIGINS').pipe(
    // The front dev server runs over HTTPS (angular.json `ssl`); HTTP is kept for `ng serve --no-ssl`.
    Config.withDefault('https://localhost:4200,http://localhost:4200'),
    Config.map((origins) => origins.split(',').map((origin) => origin.trim())),
  ),
});
