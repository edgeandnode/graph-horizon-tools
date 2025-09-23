import * as Command from "@effect/cli/Command"
import { Effect } from "effect"
import { config, status } from "./commands/index.js"
import { ConfigServiceLive } from "./services/ConfigService.js"

const command = Command.make("horizon").pipe(
  Command.withDescription("Graph Horizon CLI application - the protocol at a glance."),
  Command.withSubcommands([config, status])
)

export const run = (args: ReadonlyArray<string>) =>
  Command.run(command, {
    name: "Graph Horizon",
    version: "0.0.0"
  })(args).pipe(
    Effect.provide(ConfigServiceLive),
    Effect.catchTag("ConfigServiceError", (error) => {
      return Effect.fail(error.message)
    })
  )
