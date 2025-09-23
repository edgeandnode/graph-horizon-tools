import { Schema } from "@effect/schema"

export const Indexer = Schema.Struct({
  id: Schema.String,
  url: Schema.optional(Schema.String),
  stakedTokens: Schema.String,
  allocatedTokens: Schema.String,
  lockedTokens: Schema.String,
  queryFeesCollected: Schema.String,
  rewardsEarned: Schema.String,
  indexerIndexingRewards: Schema.String
})

export const GetIndexersResponse = Schema.Struct({
  indexers: Schema.Array(Indexer)
})

export type Indexer = Schema.Schema.Type<typeof Indexer>
export type GetIndexersResponse = Schema.Schema.Type<typeof GetIndexersResponse>
