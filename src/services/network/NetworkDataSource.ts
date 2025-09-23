import type { Effect } from "effect"
import type { NetworkServiceError } from "./NetworkService.js"
import type { GraphNetwork } from "./schemas/GraphNetwork.js"
import type { SubgraphService } from "./schemas/SubgraphService.js"

/**
 * Network data can be fetched from multiple sources. This abstract class is used to define the interface for these sources.
 * Available sources are:
 * - RPC calls to Graph Horizon contracts
 * - Graph NetworkSubgraph
 */
export abstract class NetworkDataSource {
  abstract getGraphNetwork(): Effect.Effect<GraphNetwork, NetworkServiceError>
  abstract getSubgraphService(): Effect.Effect<SubgraphService, NetworkServiceError>
}
