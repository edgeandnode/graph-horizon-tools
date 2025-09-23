import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect"
import { NetworkService } from "../services/network/NetworkService.js"
import { Display } from "../utils/Display.js"

export const protocol = Command.make(
  "protocol",
  {},
  () =>
    Effect.gen(function*() {
      yield* Display.header("Graph Protocol Network")

      const network = yield* NetworkService
      const horizon = yield* network.getGraphNetwork()
      const subgraphService = yield* network.getSubgraphService()

      yield* Display.section("Graph Horizon Details")
      yield* Display.bigNumber("Max Thawing Period", horizon.maxThawingPeriod)
      yield* Console.log("")

      yield* Display.section("Subgraph Service Details")
      yield* Display.bigNumber("Minimum Provision Tokens", subgraphService.minimumProvisionTokens)
      yield* Display.bigNumber("Maximum Provision Tokens", subgraphService.maximumProvisionTokens)
      yield* Display.bigNumber("Minimum Verifier Cut", subgraphService.minimumVerifierCut)
      yield* Display.bigNumber("Maximum Verifier Cut", subgraphService.maximumVerifierCut)
      yield* Display.bigNumber("Minimum Thawing Period", subgraphService.minimumThawingPeriod)
      yield* Display.bigNumber("Maximum Thawing Period", subgraphService.maximumThawingPeriod)
      yield* Display.bigNumber("Max POI Staleness", subgraphService.maxPOIStaleness)
      yield* Display.bigNumber("Delegation Ratio", subgraphService.delegationRatio)
      yield* Display.bigNumber("Stake to Fees Ratio", subgraphService.stakeToFeesRatio)
      yield* Display.bigNumber("Curation Cut", subgraphService.curationCut)
      yield* Console.log("")

      yield* Display.divider()
    }).pipe(
      Effect.catchAll((error) => {
        return Effect.gen(function*() {
          yield* Display.error(`Failed to fetch protocol data: ${error}`)
          return yield* Console.error(error)
        })
      })
    )
).pipe(
  Command.withDescription("Fetch protocol data with automatic RPC/Subgraph validation")
)
