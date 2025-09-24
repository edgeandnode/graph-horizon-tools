import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect"
import { NetworkService } from "../services/network/NetworkService.js"
import { Display } from "../utils/Display.js"

export const indexer = Command.make(
  "indexer",
  {
    address: Args.text({ name: "address" }).pipe(
      Args.withDescription("The indexer address to query")
    )
  },
  ({ address }) =>
    Effect.gen(function*() {
      yield* Display.header("Graph Protocol Indexer")

      const network = yield* NetworkService
      const indexerResult = yield* network.getIndexer(address.toLowerCase())

      const allMismatches = [
        ...indexerResult.mismatches
      ]

      yield* Display.section("Indexer Details")
      yield* Display.keyValue("Address", indexerResult.data.id)

      yield* Display.section("Stake Details")
      yield* Display.tokenValue("Staked Tokens", indexerResult.data.stakedTokens)
      yield* Display.tokenValue("Delegated Tokens", indexerResult.data.delegatedTokens)
      yield* Display.totalTokenValue(
        "Total Tokens",
        indexerResult.data.stakedTokens + indexerResult.data.delegatedTokens
      )

      yield* Display.section("Stake Usage Details")
      yield* Display.tokenValue("Legacy Tokens Allocated", indexerResult.data.legacyTokensAllocated)
      yield* Display.tokenValue("Legacy Tokens Locked", indexerResult.data.legacyTokensLocked)
      yield* Display.tokenValue("Provisioned Tokens", indexerResult.data.provisionedTokens)
      yield* Display.totalTokenValue("Idle Tokens", indexerResult.data.idleTokens)

      yield* Display.totalTokenValue(
        "Total Tokens Used",
        indexerResult.data.legacyTokensAllocated + indexerResult.data.legacyTokensLocked +
          indexerResult.data.provisionedTokens
      )

      yield* Display.section("Subgraph Service - Provision Details")
      yield* Display.tokenValue("Provisioned Tokens", indexerResult.data.provisionedTokens)
      yield* Display.tokenValue("Allocated Tokens", indexerResult.data.allocatedTokens)
      yield* Display.tokenValue("Thawing Tokens", indexerResult.data.thawingTokens)

      yield* Display.section("Subgraph Service - Registration Details")
      yield* Display.keyValue("URL", indexerResult.data.url)
      yield* Display.keyValue("Geo Hash", indexerResult.data.geoHash)
      yield* Display.keyValue("Rewards Destination", indexerResult.data.rewardsDestination)
      yield* Display.divider()

      if (allMismatches.length > 0) {
        yield* Display.error(`⚠️  CRITICAL: Found ${allMismatches.length} data mismatch(es) between RPC and Subgraph!`)
        for (const mismatch of allMismatches) {
          yield* Display.warning(`${mismatch.key}`)
          yield* Display.keyValue("  RPC Value", String(mismatch.rpcValue))
          yield* Display.keyValue("  Subgraph Value", String(mismatch.subgraphValue))
        }
      } else {
        yield* Display.success("All data sources match - validation successful!")
      }
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
