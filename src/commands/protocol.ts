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
      yield* Display.spinner("Fetching protocol data from RPC and Subgraph...")

      const network = yield* NetworkService
      const result = yield* network.getGraphNetwork()

      yield* Display.success("Data validated successfully!")
      yield* Display.section("Network Details")
      yield* Display.bigNumber("Max Thawing Period", result.maxThawingPeriod)
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
