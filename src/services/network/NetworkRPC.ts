import { connectGraphHorizon, connectSubgraphService } from "@graphprotocol/toolshed/deployments"
import { Context, Data, Effect, Layer } from "effect"
import { JsonRpcProvider } from "ethers"
import { ConfigService } from "../ConfigService.js"
import type { NetworkDataSource } from "./NetworkService.js"

export class NetworkRPCError extends Data.TaggedError("NetworkRPCError")<{
  message: string
  method?: string
  contract?: string
}> {}

export class NetworkRPC extends Context.Tag("NetworkRPC")<NetworkRPC, NetworkDataSource>() {}

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
    const horizonContracts = yield* Effect.try({
      try: () => connectGraphHorizon(chainId, provider as any, "addresses.json"),
      catch: (error) =>
        new NetworkRPCError({
          message: `Failed to connect to Graph Horizon contracts: ${error}`
        })
    })
    const subgraphServiceContracts = yield* Effect.try({
      try: () => connectSubgraphService(chainId, provider as any, "addresses.json"),
      catch: (error) =>
        new NetworkRPCError({
          message: `Failed to connect to Subgraph Service contracts: ${error}`
        })
    })

    const getGraphNetwork = () =>
      Effect.gen(function*() {
        const rawResult = yield* Effect.all(
          {
            maxThawingPeriod: Effect.tryPromise({
              try: () => horizonContracts.HorizonStaking.getMaxThawingPeriod(),
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

        return rawResult
      })

    const getSubgraphService = () =>
      Effect.gen(function*() {
        const rawResult = yield* Effect.all(
          {
            provisionTokensRange: Effect.tryPromise({
              try: () => subgraphServiceContracts.SubgraphService.getProvisionTokensRange(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `getProvisionTokensRange failed: ${String(e)}`,
                  contract: "SubgraphService",
                  method: "getProvisionTokensRange"
                })
            }),
            thawingPeriodRange: Effect.tryPromise({
              try: () => subgraphServiceContracts.SubgraphService.getThawingPeriodRange(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `getThawingPeriodRange failed: ${String(e)}`,
                  contract: "SubgraphService",
                  method: "getThawingPeriodRange"
                })
            }),
            verifierCutRange: Effect.tryPromise({
              try: () => subgraphServiceContracts.SubgraphService.getVerifierCutRange(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `getVerifierCutRange failed: ${String(e)}`,
                  contract: "SubgraphService",
                  method: "getVerifierCutRange"
                })
            }),
            delegationRatio: Effect.tryPromise({
              try: () => subgraphServiceContracts.SubgraphService.getDelegationRatio(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `getDelegationRatio failed: ${String(e)}`,
                  contract: "SubgraphService",
                  method: "getDelegationRatio"
                })
            }),
            curationFeesCut: Effect.tryPromise({
              try: () => subgraphServiceContracts.SubgraphService.curationFeesCut(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `curationFeesCut failed: ${String(e)}`,
                  contract: "SubgraphService",
                  method: "curationFeesCut"
                })
            }),
            maxPOIStaleness: Effect.tryPromise({
              try: () => subgraphServiceContracts.SubgraphService.maxPOIStaleness(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `maxPOIStaleness failed: ${String(e)}`,
                  contract: "SubgraphService",
                  method: "maxPOIStaleness"
                })
            }),
            stakeToFeesRatio: Effect.tryPromise({
              try: () => subgraphServiceContracts.SubgraphService.stakeToFeesRatio(),
              catch: (e) =>
                new NetworkRPCError({
                  message: `stakeToFeesRatio failed: ${String(e)}`,
                  contract: "SubgraphService",
                  method: "stakeToFeesRatio"
                })
            })
          },
          { concurrency: "unbounded" }
        )

        return {
          minimumProvisionTokens: rawResult.provisionTokensRange[0],
          maximumProvisionTokens: rawResult.provisionTokensRange[1],
          minimumVerifierCut: rawResult.verifierCutRange[0],
          maximumVerifierCut: rawResult.verifierCutRange[1],
          minimumThawingPeriod: rawResult.thawingPeriodRange[0],
          maximumThawingPeriod: rawResult.thawingPeriodRange[1],
          maxPOIStaleness: rawResult.maxPOIStaleness,
          delegationRatio: rawResult.delegationRatio,
          stakeToFeesRatio: rawResult.stakeToFeesRatio,
          curationCut: rawResult.curationFeesCut
        }
      })

    return NetworkRPC.of({
      getGraphNetwork,
      getSubgraphService
    })
  })
)
