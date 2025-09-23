import { Schema } from "@effect/schema"
import type { ParseError } from "@effect/schema/ParseResult"
import { Context, Data, Effect, Layer } from "effect"
import { ConfigService } from "./ConfigService.js"
import { QueryLoader } from "./QueryLoader.js"
import type { QueryName, QueryResponse } from "./schemas/index.js"
import { QuerySchemas } from "./schemas/index.js"

export class NetworkSubgraphError extends Data.TaggedError("NetworkSubgraphError")<{
  message: string
  query?: string
  variables?: unknown
}> {}

export class NetworkSubgraph extends Context.Tag("NetworkSubgraph")<
  NetworkSubgraph,
  {
    readonly query: <T>(
      query: string,
      variables?: Record<string, unknown>
    ) => Effect.Effect<T, NetworkSubgraphError>
    readonly queryByName: (
      queryName: QueryName,
      variables?: Record<string, unknown>
    ) => Effect.Effect<QueryResponse<QueryName>, NetworkSubgraphError | Error | ParseError>
  }
>() {}

export const SubgraphServiceLive = Layer.effect(
  NetworkSubgraph,
  Effect.gen(function*() {
    const config = yield* ConfigService
    yield* QueryLoader.loadQueries()

    const query = <T>(query: string, variables?: Record<string, unknown>) =>
      Effect.gen(function*() {
        const response = yield* Effect.tryPromise({
          try: () =>
            fetch(config.subgraphUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.studioApiKey}`
              },
              body: JSON.stringify({
                query,
                variables
              })
            }),
          catch: (error) =>
            new NetworkSubgraphError({
              message: `Failed to fetch from subgraph: ${error}`,
              query,
              variables
            })
        })

        if (!response.ok) {
          return yield* Effect.fail(
            new NetworkSubgraphError({
              message: `Subgraph request failed: ${response.status} ${response.statusText}`,
              query,
              variables
            })
          )
        }

        const data = yield* Effect.tryPromise({
          try: () => response.json() as Promise<{ data?: T; errors?: Array<{ message: string }> }>,
          catch: (error) =>
            new NetworkSubgraphError({
              message: `Failed to parse subgraph response: ${error}`,
              query,
              variables
            })
        })

        if (data.errors && data.errors.length > 0) {
          return yield* Effect.fail(
            new NetworkSubgraphError({
              message: `GraphQL errors: ${data.errors.map((e) => e.message).join(", ")}`,
              query,
              variables
            })
          )
        }

        if (!data.data) {
          return yield* Effect.fail(
            new NetworkSubgraphError({
              message: "No data returned from subgraph",
              query,
              variables
            })
          )
        }

        return data.data
      })

    const queryByName = (
      queryName: QueryName,
      variables?: Record<string, unknown>
    ): Effect.Effect<QueryResponse<QueryName>, NetworkSubgraphError | Error | ParseError> =>
      Effect.gen(function*() {
        const queryData = yield* QueryLoader.getQuery(queryName)
        const rawResult = yield* query(queryData.query, variables)

        if (queryName === "GetGraphNetwork") {
          return yield* Schema.decodeUnknown(QuerySchemas.GetGraphNetwork)(rawResult)
        } else if (queryName === "GetIndexers") {
          return yield* Schema.decodeUnknown(QuerySchemas.GetIndexers)(rawResult)
        } else {
          throw new Error(`Schema not found for query: ${queryName}`)
        }
      })

    return NetworkSubgraph.of({
      query,
      queryByName
    })
  })
)
