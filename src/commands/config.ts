import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect"
import { ConfigService } from "../services/ConfigService.js"

export const config = Command.make("config", {}, () =>
  Effect.gen(function*() {
    const config = yield* ConfigService

    yield* Console.log("Configuration loaded:")
    yield* Console.log("===================")
    yield* Console.log(`RPC URL: ${config.rpcUrl}`)
    yield* Console.log(`Subgraph URL: ${config.subgraphUrl}`)
    yield* Console.log(`Output Format: ${config.outputFormat}`)
    yield* Console.log(`Show Discrepancies: ${config.showDiscrepancies}`)
  }))
