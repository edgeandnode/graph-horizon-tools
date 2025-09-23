import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect"
import { ConfigService } from "../services/ConfigService.js"

export const status = Command.make("status", {}, () =>
  Effect.gen(function*() {
    const config = yield* ConfigService
    yield* Console.log("Network Status")
    yield* Console.log("=============")
    yield* Console.log(`RPC: ${config.rpcUrl}`)
    yield* Console.log(`Subgraph: ${config.subgraphUrl}`)
  }))
