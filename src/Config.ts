import { Schema } from "@effect/schema"
import { Config } from "effect"

const OutputFormat = Schema.Literal("json", "table", "compact")
const ShowDiscrepancies = Schema.Literal("always", "never", "on-error")

export const AppConfig = Schema.Struct({
  rpcUrl: Schema.NonEmptyString.pipe(
    Schema.annotations({
      description: "Ethereum RPC endpoint URL",
      examples: ["https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY"]
    })
  ),
  subgraphUrl: Schema.NonEmptyString.pipe(
    Schema.annotations({
      description: "The Graph subgraph endpoint URL (including API key if needed)",
      examples: ["https://api.thegraph.com/subgraphs/name/..."]
    })
  ),
  outputFormat: Schema.optionalWith(OutputFormat, { default: () => "table" as const }),
  showDiscrepancies: Schema.optionalWith(ShowDiscrepancies, { default: () => "on-error" as const })
})
export type AppConfig = Schema.Schema.Type<typeof AppConfig>

export const loadConfig = Config.all({
  rpcUrl: Config.string("RPC_URL"),
  subgraphUrl: Config.string("SUBGRAPH_URL"),
  outputFormat: Schema.Config("OUTPUT_FORMAT", Schema.String.pipe(Schema.compose(OutputFormat)))
    .pipe(Config.withDefault("table" as const)),
  showDiscrepancies: Schema.Config("SHOW_DISCREPANCIES", Schema.String.pipe(Schema.compose(ShowDiscrepancies)))
    .pipe(Config.withDefault("on-error" as const))
})
