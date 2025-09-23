#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider"
import * as Effect from "effect/Effect"

import { run } from "./Cli.js"

NodeRuntime.runMain(
  run(process.argv).pipe(
    Effect.provide(PlatformConfigProvider.layerDotEnvAdd(".env")),
    Effect.provide(NodeContext.layer)
  )
)
