import { createBuilder } from './.aspire/modules/aspire.mjs'

const builder = await createBuilder()

// The external URI mode lets this POC use an existing local PostgreSQL when
// container networking is unavailable; the default is Aspire-managed PostgreSQL.
if (process.env.POC_POSTGRES_URL) {
  await builder.addViteApp('workflow-studio', '../app')
    .withHttpEndpoint({ env: 'PORT' })
    .withEnvironment('DBOS_SYSTEM_DATABASE_URL', process.env.POC_POSTGRES_URL)
    .withExternalHttpEndpoints()
} else {
  const postgres = await builder.addPostgres('postgres')
  const database = await postgres.addDatabase('mathdb')
  await builder.addViteApp('workflow-studio', '../app')
    .withHttpEndpoint({ env: 'PORT' })
    .withReference(database)
    .waitFor(database)
    .withExternalHttpEndpoints()
}

await builder.build().run()
