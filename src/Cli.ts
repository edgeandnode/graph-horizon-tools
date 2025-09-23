import * as Command from "@effect/cli/Command"
import { Console, Effect, Layer } from "effect"
import { config, network } from "./commands/index.js"
import { ConfigServiceLive } from "./services/ConfigService.js"
import { NetworkRPCLive } from "./services/NetworkRPC.js"
import { SubgraphServiceLive } from "./services/NetworkSubgraph.js"

const AppLayer = Layer.mergeAll(
  ConfigServiceLive,
  SubgraphServiceLive.pipe(Layer.provide(ConfigServiceLive)),
  NetworkRPCLive.pipe(Layer.provide(ConfigServiceLive))
)

const command = Command.make("horizon", {
  args: {}
}).pipe(
  Command.withDescription("Graph Horizon CLI application - The Graph protocol at a glance."),
  Command.withSubcommands([config, network])
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
