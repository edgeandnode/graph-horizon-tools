import type { Schema } from "@effect/schema"
import { GetGraphNetworkResponse } from "./GraphNetwork.js"
import { GetIndexersResponse } from "./Indexer.js"

export { GetGraphNetworkResponse, GraphNetwork } from "./GraphNetwork.js"
export { GetIndexersResponse, Indexer } from "./Indexer.js"

export const QuerySchemas = {
  GetGraphNetwork: GetGraphNetworkResponse,
  GetIndexers: GetIndexersResponse
} as const

export type QueryName = keyof typeof QuerySchemas
export type QueryResponse<T extends QueryName> = Schema.Schema.Type<(typeof QuerySchemas)[T]>
