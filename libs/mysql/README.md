Weenie MySql
========================================================================================================================

This package is meant to be used with [Weenie](https://npmjs.com/@wymp/weenie-base). However, if you are not using
Weenie but are interested in this functionality, there's nothing wrong with using it directly. That said, in this case,
it is nothing more than a wrapper around [`@wymp/simple-db-mysql`](https://npmjs.com/package/@wymp/simple-db-mysql)
(which itself is a wrapper around [`mysql2](https://npmjs.com/package/mysql2).)

Config options are `mysql2::PoolOptions`. Most of these are documented
[here](https://github.com/mysqljs/mysql#connection-options) (these are the base mysql connection options), and the
remainder are [here](https://github.com/sidorares/node-mysql2/blob/73df13cbd5dcc109504e630d93006a23adc65c02/typings/mysql/lib/Pool.d.ts#L12).

The most common config options are these:

```ts
const config = {
  mysql: {
    host: 'localhost',
    port: 3306,
    user: 'your-user',
    password: 'your-password',
    database: 'my-database',
  }
}
```
