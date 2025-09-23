import { Context, Data, Effect, Layer } from "effect"
import type { NetworkRPCError } from "./NetworkRPC.js"
import { NetworkRPC } from "./NetworkRPC.js"
import type { NetworkSubgraphError } from "./NetworkSubgraph.js"
import { NetworkSubgraph } from "./NetworkSubgraph.js"
import type { GraphNetwork } from "./schemas/GraphNetwork.js"
import type { SubgraphService } from "./schemas/SubgraphService.js"

export class DataMismatchError extends Data.TaggedError("DataMismatchError")<{
  message: string
  method: string
  rpcData: unknown
  subgraphData: unknown
}> {}

export type NetworkServiceError = DataMismatchError | NetworkSubgraphError | NetworkRPCError

/**
 * Network data can be fetched from multiple sources. This abstract class is used to define the interface for these sources.
 * Available sources are:
 * - RPC calls to Graph Horizon contracts
 * - Graph NetworkSubgraph
 */
export abstract class NetworkDataSource {
  abstract getGraphNetwork(): Effect.Effect<GraphNetwork, NetworkServiceError>
  abstract getSubgraphService(): Effect.Effect<SubgraphService, NetworkServiceError>
}

export class NetworkService extends Context.Tag("NetworkService")<NetworkService, NetworkDataSource>() {}

export const NetworkServiceLive = Layer.effect(
  NetworkService,
  Effect.gen(function*() {
    const rpc = yield* NetworkRPC
    const subgraph = yield* NetworkSubgraph

    const getGraphNetwork = () =>
      Effect.gen(function*() {
        const [rpcData, subgraphData] = yield* Effect.all(
          [rpc.getGraphNetwork(), subgraph.getGraphNetwork()],
          { concurrency: "unbounded" }
        )

        if (!deepEqual(rpcData, subgraphData)) {
          return yield* Effect.fail(
            new DataMismatchError({
              message: "Data mismatch between RPC and Subgraph!",
              method: "getGraphNetwork",
              rpcData,
              subgraphData
            })
          )
        }

        return rpcData
      })

    const getSubgraphService = () =>
      Effect.gen(function*() {
        const [rpcData, subgraphData] = yield* Effect.all(
          [rpc.getSubgraphService(), subgraph.getSubgraphService()],
          { concurrency: "unbounded" }
        )

        if (!deepEqual(rpcData, subgraphData)) {
          return yield* Effect.fail(
            new DataMismatchError({
              message: "Data mismatch between RPC and Subgraph!",
              method: "getSubgraphService",
              rpcData,
              subgraphData
            })
          )
        }

        return rpcData
      })

    return NetworkService.of({
      getGraphNetwork,
      getSubgraphService
    })
  })
)

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  // BigInts
  if (typeof a === "bigint" && typeof b === "bigint") {
    return a === b
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]))
  }

  // Objects
  if (a && b && typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as any)
    const bKeys = Object.keys(b as any)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every((k) => deepEqual((a as any)[k], (b as any)[k]))
  }

  return false
}
