import { Schema } from "@effect/schema"
import { connectGraphHorizon } from "@graphprotocol/toolshed/deployments"
import { Context, Data, Effect, Layer } from "effect"
import { JsonRpcProvider } from "ethers"
import { ConfigService } from "../ConfigService.js"
import { GraphNetwork } from "./schemas/GraphNetwork.js"

export class NetworkRPCError extends Data.TaggedError("NetworkRPCError")<{
  message: string
  method?: string
  contract?: string
}> {}

export class NetworkRPC extends Context.Tag("NetworkRPC")<
  NetworkRPC,
  {
    readonly getGraphNetwork: () => Effect.Effect<GraphNetwork, NetworkRPCError>
  }
>() {}

export const NetworkRPCLive = Layer.effect(
  NetworkRPC,
  Effect.gen(function*() {
    const config = yield* ConfigService
    const provider = new JsonRpcProvider(config.rpcUrl)
    const network = yield* Effect.tryPromise({
      try: () => provider.getNetwork(),
      catch: (error) =>
        new NetworkRPCError({
          message: `Failed to get network info: ${error}`
        })
    })

    const chainId = Number(network.chainId)

    const contracts = yield* Effect.try({
      try: () => connectGraphHorizon(chainId, provider as any, "addresses.json"),
      catch: (error) =>
        new NetworkRPCError({
          message: `Failed to connect to Graph Horizon contracts: ${error}`
        })
    })

    const getGraphNetwork = () =>
      Effect.gen(function*() {
        const rawResult = yield* Effect.all(
          {
            maxThawingPeriod: Effect.tryPromise({
              try: () => contracts.HorizonStaking.getMaxThawingPeriod(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `getMaxThawingPeriod failed: ${String(e)}`,
                  contract: "HorizonStaking",
                  method: "getMaxThawingPeriod"
                })
            })
          },
          { concurrency: "unbounded" }
        )

        return yield* Schema.decodeUnknown(GraphNetwork)(rawResult).pipe(
          Effect.catchTag("ParseError", (error) =>
            Effect.fail(
              new NetworkRPCError({
                message: `Failed to parse graph network: ${error}`
              })
            ))
        )
      })

    return NetworkRPC.of({
      getGraphNetwork
    })
  })
)
