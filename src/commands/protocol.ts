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
      const horizonResult = yield* network.getGraphNetwork()
      const subgraphServiceResult = yield* network.getSubgraphService()

      const allMismatches = [...horizonResult.mismatches, ...subgraphServiceResult.mismatches]

      if (allMismatches.length > 0) {
        yield* Display.error(`⚠️  CRITICAL: Found ${allMismatches.length} data mismatch(es) between RPC and Subgraph!`)
        yield* Display.section("Data Mismatches Detected")
        for (const mismatch of allMismatches) {
          yield* Display.warning(`${mismatch.key}`)
          yield* Display.keyValue("  RPC Value", String(mismatch.rpcValue))
          yield* Display.keyValue("  Subgraph Value", String(mismatch.subgraphValue))
        }
        yield* Console.log("")
      } else {
        yield* Display.success("✅ All data sources match - validation successful!")
      }

      yield* Display.section("Graph Horizon Details")
      yield* Display.bigNumber("Max Thawing Period", horizonResult.data.maxThawingPeriod)
      yield* Console.log("")

      yield* Display.section("Subgraph Service Details")
      yield* Display.tokenValue("Minimum Provision Tokens", subgraphServiceResult.data.minimumProvisionTokens)
      yield* Display.tokenValue("Maximum Provision Tokens", subgraphServiceResult.data.maximumProvisionTokens)
      yield* Display.bigNumber("Minimum Verifier Cut", subgraphServiceResult.data.minimumVerifierCut)
      yield* Display.bigNumber("Maximum Verifier Cut", subgraphServiceResult.data.maximumVerifierCut)
      yield* Display.bigNumber("Minimum Thawing Period", subgraphServiceResult.data.minimumThawingPeriod)
      yield* Display.bigNumber("Maximum Thawing Period", subgraphServiceResult.data.maximumThawingPeriod)
      yield* Display.bigNumber("Max POI Staleness", subgraphServiceResult.data.maxPOIStaleness)
      yield* Display.bigNumber("Delegation Ratio", subgraphServiceResult.data.delegationRatio)
      yield* Display.bigNumber("Stake to Fees Ratio", subgraphServiceResult.data.stakeToFeesRatio)
      yield* Display.bigNumber("Curation Cut", subgraphServiceResult.data.curationCut)
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
