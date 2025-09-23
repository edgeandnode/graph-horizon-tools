import { Schema } from "@effect/schema"

export const GraphNetwork = Schema.Struct({
  id: Schema.String,
  controller: Schema.String,
  totalSupply: Schema.String,
  totalDelegatedTokens: Schema.String,
  totalTokensStaked: Schema.String,
  totalQueryFees: Schema.String,
  totalCuratorQueryFees: Schema.String,
  networkGRTIssuance: Schema.String,
  epochManager: Schema.String,
  epochLength: Schema.Number,
  currentEpoch: Schema.Number
})

export const GetGraphNetworkResponse = Schema.Struct({
  graphNetworks: Schema.Array(GraphNetwork)
})

export type GraphNetwork = Schema.Schema.Type<typeof GraphNetwork>
export type GetGraphNetworkResponse = Schema.Schema.Type<typeof GetGraphNetworkResponse>
