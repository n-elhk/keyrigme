import { PgClient } from '@effect/sql-pg';
import { Config, Layer, String } from 'effect';
import { Migrator } from 'effect/sql';
import { migrations } from './migrations';

const PgLive = PgClient.layerConfig({
  url: Config.Redacted('DATABASE_URL'),
  transformQueryNames: Config.succeed(String.camelToSnake),
  transformResultNames: Config.succeed(String.snakeToCamel),
});

/** Runs pending migrations when the layer is built. */
const MigratorLive = Layer.effectDiscard(Migrator.make({})({ loader: migrations }));

export const DatabaseLive = MigratorLive.pipe(Layer.provideMerge(PgLive));
