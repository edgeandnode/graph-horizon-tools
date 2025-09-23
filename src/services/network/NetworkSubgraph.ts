import { Schema } from "@effect/schema"
import { Context, Data, Effect, Layer } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { ConfigService } from "../ConfigService.js"
import type { GraphNetworkSubgraphResponse } from "./schemas/GraphNetwork.js"
import { GraphNetwork } from "./schemas/GraphNetwork.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class NetworkSubgraphError extends Data.TaggedError("NetworkSubgraphError")<{
  message: string
  query?: string
  variables?: unknown
}> {}

export class NetworkSubgraph extends Context.Tag("NetworkSubgraph")<
  NetworkSubgraph,
  {
    readonly getGraphNetwork: () => Effect.Effect<GraphNetwork, NetworkSubgraphError>
  }
>() {
  static loadQuery(queryName: string) {
    return Effect.sync(() => {
      const queriesDir = path.join(__dirname, "queries")
      const query = fs.readFileSync(path.join(queriesDir, `${queryName}.graphql`), "utf-8").trim()
      return query
    })
  }
}

export const NetworkSubgraphlive = Layer.effect(
  NetworkSubgraph,
  Effect.gen(function*() {
    const config = yield* ConfigService

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

    const getGraphNetwork = () =>
      Effect.gen(function*() {
        const queryData = yield* NetworkSubgraph.loadQuery("GraphNetwork")
        const rawResult = (yield* query(queryData)) as GraphNetworkSubgraphResponse
        if (!rawResult.graphNetworks) {
          throw new NetworkSubgraphError({
            message: "Graph network not found"
          })
        }
        const graphNetwork = {
          maxThawingPeriod: BigInt(rawResult.graphNetworks[0].maxThawingPeriod)
        }
        return yield* Schema.decodeUnknown(GraphNetwork)(graphNetwork).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new NetworkSubgraphError({
                message: `Failed to parse graph network: ${error}`,
                query: queryData
              })
            ))
        )
      })

    return NetworkSubgraph.of({
      getGraphNetwork
    })
  })
)
