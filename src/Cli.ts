import * as Command from "@effect/cli/Command"
import { Console, Effect, Layer } from "effect"
import { config, subgraph } from "./commands/index.js"
import { ConfigServiceLive } from "./services/ConfigService.js"
import { SubgraphServiceLive } from "./services/NetworkSubgraph.js"

const AppLayer = Layer.merge(
  ConfigServiceLive,
  SubgraphServiceLive.pipe(Layer.provide(ConfigServiceLive))
)

const command = Command.make("horizon", {
  args: {}
}).pipe(
  Command.withDescription("Graph Horizon CLI application - The Graph protocol at a glance."),
  Command.withSubcommands([config, subgraph])
)

export const run = (args: ReadonlyArray<string>) =>
  Command.run(command, {
    name: "Graph Horizon",
    version: "0.0.0"
  })(args).pipe(
    Effect.provide(AppLayer),
    Effect.catchTag("ConfigServiceError", (error) =>
      Console.error(error.message).pipe(
        Effect.zipRight(Effect.fail(error))
      ))
  )
