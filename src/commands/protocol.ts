import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect"
import { NetworkRPC } from "../services/network/NetworkRPC.js"
import { NetworkSubgraph } from "../services/network/NetworkSubgraph.js"

export const protocol = Command.make(
  "protocol",
  {},
  () =>
    Effect.gen(function*() {
      const rpcService = yield* NetworkRPC
      const subgraphService = yield* NetworkSubgraph

      const result = yield* rpcService.getGraphNetwork()
      const subgraphResult = yield* subgraphService.getGraphNetwork()

      yield* Console.log("Result:")
      yield* Console.log(result)
      yield* Console.log("Subgraph Result:")
      yield* Console.log(subgraphResult)
    }).pipe(
      Effect.catchAll((error) => Console.error(`Error: ${error}`))
    )
).pipe(
  Command.withDescription("Make RPC calls to Graph Horizon contracts")
)
