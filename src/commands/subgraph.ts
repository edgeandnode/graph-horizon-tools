import * as Args from "@effect/cli/Args"
import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect"
import { NetworkSubgraph } from "../services/NetworkSubgraph.js"

export const subgraph = Command.make(
  "subgraph",
  {
    queryName: Args.text({ name: "query" }).pipe(
      Args.withDescription("Name of the query to execute (e.g., GetGraphNetwork, GetIndexers)")
    )
  },
  ({ queryName }) =>
    Effect.gen(function*() {
      const subgraphService = yield* NetworkSubgraph

      yield* Console.log(`Executing query: ${queryName}`)
      yield* Console.log("---")

      if (queryName === "GetGraphNetwork" || queryName === "GetIndexers") {
        const result = yield* subgraphService.queryByName(queryName)
        yield* Console.log("Typed Result:")
        yield* Console.log(JSON.stringify(result, null, 2))
      }
    }).pipe(
      Effect.catchAll((error) => Console.error(`Error: ${error}`))
    )
).pipe(
  Command.withDescription("Execute a predefined GraphQL query from the queries directory")
)
