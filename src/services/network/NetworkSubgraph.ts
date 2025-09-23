import { Context, Data, Effect, Layer } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { ConfigService } from "../ConfigService.js"
import type { NetworkDataSource } from "./NetworkDataSource.js"
import type { GraphNetworkSubgraphResponse } from "./schemas/GraphNetwork.js"
import type { SubgraphServiceSubgraphResponse } from "./schemas/SubgraphService.js"

export class NetworkSubgraphError extends Data.TaggedError("NetworkSubgraphError")<{
  message: string
  query?: string
  variables?: unknown
}> {}

export class NetworkSubgraph extends Context.Tag("NetworkSubgraph")<NetworkSubgraph, NetworkDataSource>() {
  static loadQuery(queryName: string) {
    return Effect.sync(() => {
      const queriesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "queries")
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
        return {
          maxThawingPeriod: BigInt(rawResult.graphNetworks[0].maxThawingPeriod)
        }
      })

    const getSubgraphService = () =>
      Effect.gen(function*() {
        const queryData = yield* NetworkSubgraph.loadQuery("SubgraphService")
        const rawResult = (yield* query(queryData)) as SubgraphServiceSubgraphResponse
        if (!rawResult.dataServices) {
          throw new NetworkSubgraphError({
            message: "Subgraph service not found"
          })
        }
        return {
          minimumProvisionTokens: BigInt(rawResult.dataServices[0].minimumProvisionTokens),
          maximumProvisionTokens: BigInt(rawResult.dataServices[0].maximumProvisionTokens),
          minimumVerifierCut: BigInt(rawResult.dataServices[0].minimumVerifierCut),
          maximumVerifierCut: BigInt(rawResult.dataServices[0].maximumVerifierCut),
          minimumThawingPeriod: BigInt(rawResult.dataServices[0].minimumThawingPeriod),
          maximumThawingPeriod: BigInt(rawResult.dataServices[0].maximumThawingPeriod),
          maxPOIStaleness: BigInt(rawResult.dataServices[0].maxPOIStaleness),
          delegationRatio: BigInt(rawResult.dataServices[0].delegationRatio),
          stakeToFeesRatio: BigInt(rawResult.dataServices[0].stakeToFeesRatio),
          curationCut: BigInt(rawResult.dataServices[0].curationCut)
        }
      })

    return NetworkSubgraph.of({
      getGraphNetwork,
      getSubgraphService
    })
  })
)
