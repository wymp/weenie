import { SimpleDbMysql } from '@wymp/simple-db-mysql';

/** The type of the input deps expected by this weenie function */
export type MysqlInputDeps = {
  config: {
    mysql: ConstructorParameters<typeof SimpleDbMysql>[0];
  };
};

/** The output deps provided by this weenie function */
export type MysqlOutputDeps = {
  mysql: SimpleDbMysql;
};

/**
 * A weenie function providing a mysql database connection wrapped by the
 * [`SimpleSqlDbInterface`](https://github.com/wymp/ts-simple-interfaces/blob/7d65ceb7111de283473f122f9ab80c21f2958908/libs/ts-simple-interfaces/src/datasource.ts#L61)
 */
export const mysql = (deps: MysqlInputDeps): MysqlOutputDeps => ({
  mysql: new SimpleDbMysql({
    ...deps.config.mysql,
    // These are necessary because for some reason null values were causing trouble
    host: deps.config.mysql.host || undefined,
    port: deps.config.mysql.port || undefined,
    socketPath: deps.config.mysql.socketPath || undefined,
  }),
});
