import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  if (!await knex.schema.hasTable('users')) {
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('passwordBcrypt').notNullable();
      table.boolean('isAdmin').defaultTo(false).notNullable();
    });
  }

  if (!await knex.schema.hasTable('request-stats')) {
    await knex.schema.createTable('request-stats', (table) => {
      table.uuid('id').primary();
      table.string('method', 10).notNullable();
      table.string('path').notNullable();
      table.boolean('authd');
      table.smallint('responseStatus').notNullable();
      table.bigInteger('timestampMs').notNullable();
    });
  }

  if (!await knex.schema.hasTable('sessions')) {
    await knex.schema.createTable('sessions', (table) => {
      table.uuid('id').primary();
      table.string('token').unique().notNullable();
      table.uuid('userId').references('id').inTable('users').notNullable();
      table.bigInteger('createdAtMs').notNullable();
      table.bigInteger('expiresAtMs').notNullable();
      table.bigInteger('invalidatedAtMs');
    });
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('request-stats');
  await knex.schema.dropTableIfExists('users');
}

