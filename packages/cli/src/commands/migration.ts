import * as Command from "@effect/cli/Command"
import { Console, Effect } from "effect"
import { NetworkSubgraph } from "../services/network/NetworkSubgraph.js"
import { Display } from "../utils/Display.js"

const HORIZON_VERSION = "1.7.0"

export const fetchIndexerVersion = (indexer: { url: string }) =>
  Effect.tryPromise({
    try: async () => {
      const url = new URL(indexer.url)
      url.pathname = "/version"
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Failed to fetch ${indexer.url}: ${res.status}`)
      return await res.text()
    },
    catch: (error) => new Error(String(error))
  })

export const migration = Command.make(
  "migration",
  {},
  () =>
    Effect.gen(function*() {
      yield* Display.header("Graph Horizon - Migration Status")

      const network = yield* NetworkSubgraph
      const indexerListResult = yield* network.getIndexerList()

      const indexerCount = indexerListResult.indexers.length
      const indexerWithAllocationsCount = indexerListResult.indexers.filter((indexer) =>
        indexer.allocations.length > 0
      ).length

      const lastMonth = Math.floor((new Date().setMonth(new Date().getMonth() - 1)) / 1000)
      const activeIndexers = indexerListResult.indexers.filter((indexer) =>
        indexer.allocations.some((allocation: { createdAt: number }) => allocation.createdAt > lastMonth)
      )

      const migratedIndexers = activeIndexers.filter((indexer) =>
        indexerListResult.provisions.some((provision) => provision.indexer.id === indexer.id)
      )

      const indexersPendingMigration = activeIndexers.filter((indexer) =>
        !indexerListResult.provisions.some((provision) => provision.indexer.id === indexer.id)
      )

      const indexersWithNoURL = activeIndexers.filter((indexer) =>
        indexer.url === "" || indexer.url === null || indexer.url === undefined
      )

      const indexersWithURL = activeIndexers.filter((indexer) => indexer.url && indexer.url !== "")

      const activeIndexersWithVersions = yield* Effect.forEach(
        indexersWithURL,
        (indexer) =>
          Effect.gen(function*() {
            const versionResponse = yield* fetchIndexerVersion(indexer).pipe(
              Effect.catchAll((error) => Effect.succeed(`Error: ${error.message} for ${indexer.url}`))
            )
            let version = null
            try {
              version = JSON.parse(versionResponse).version
            } catch { /* empty */ }
            return {
              ...indexer,
              version
            }
          }),
        { concurrency: "unbounded" }
      )

      const unreachableActiveIndexers = activeIndexersWithVersions.filter((indexer) => indexer.version === null)
      const reachableActiveIndexers = activeIndexersWithVersions.filter((indexer) => indexer.version !== null)

      yield* Display.section("Indexers by activity")
      yield* Display.keyValue("Total Indexers", indexerCount)
      yield* Display.keyValue("Indexers with allocations", indexerWithAllocationsCount)
      yield* Display.keyValue("Active Indexers (last month)", activeIndexers.length)

      yield* Display.section("Active indexers by migration status")
      yield* Display.keyValue("Migrated indexers", migratedIndexers.length)
      yield* Display.keyValue("Migration pending", indexersPendingMigration.length)

      yield* Display.section("Active indexers by version")
      yield* Display.keyValue("No URL", indexersWithNoURL.length)
      yield* Display.keyValue("Unreachable", unreachableActiveIndexers.length)
      yield* Display.keyValue("Reachable", reachableActiveIndexers.length)
      yield* Display.keyValue(
        "• Pre-horizon indexer stack",
        reachableActiveIndexers.filter((indexer) => compareVersions(indexer.version, HORIZON_VERSION) < 0).length
      )
      yield* Display.keyValue(
        "• Horizon indexer stack",
        reachableActiveIndexers.filter((indexer) => compareVersions(indexer.version, HORIZON_VERSION) >= 0).length
      )

      yield* Display.section("Active indexers details")

      // Group indexers by version
      const indexersByVersion = activeIndexersWithVersions.reduce((acc, indexer) => {
        const version = indexer.version ?? "N/A"
        if (!acc[version]) {
          acc[version] = []
        }
        acc[version].push(indexer)
        return acc
      }, {} as Record<string, typeof activeIndexersWithVersions>)

      // Sort versions (N/A last, then descending version order)
      const sortedVersions = Object.keys(indexersByVersion).sort((a, b) => {
        if (a === "N/A") return 1
        if (b === "N/A") return -1
        return compareVersions(b, a) // descending order
      })

      // Display grouped by version
      for (const version of sortedVersions) {
        const indexers = indexersByVersion[version]
        yield* Console.log(`\n  Version ${version} (${indexers.length} indexer${indexers.length === 1 ? "" : "s"}):`)
        for (const indexer of indexers) {
          yield* Display.tripleString(indexer.id, "", indexer.url ?? "N/A")
        }
      }
    }).pipe(
      Effect.catchAll((error) => {
        return Effect.gen(function*() {
          yield* Display.error(`Failed to fetch migration data: ${error}`)
          return yield* Console.error(error)
        })
      })
    )
).pipe(
  Command.withDescription("Fetch migration data for horizon upgrade")
)

function parseVersion(v: string) {
  return v.split(".").map(Number)
}

function compareVersions(a: string, b: string) {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
