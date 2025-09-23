import { Effect } from "effect"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface Query {
  name: string
  query: string
  variables?: Array<string> | undefined
}

export class QueryLoader {
  private static queries = new Map<string, Query>()

  static loadQueries() {
    return Effect.sync(() => {
      const queriesDir = path.join(__dirname, "queries")
      const files = fs.readdirSync(queriesDir).filter((f) => f.endsWith(".graphql"))

      for (const file of files) {
        const content = fs.readFileSync(path.join(queriesDir, file), "utf-8").trim()
        const queryName = path.basename(file, ".graphql")

        // Parse the single query in the file
        const query = this.parseQuery(content, queryName)
        if (query) {
          this.queries.set(query.name, query)
        }
      }

      return this.queries
    })
  }

  private static parseQuery(content: string, fallbackName: string): Query | null {
    const queryRegex = /query\s+(\w+)(\([^)]*\))?\s*{/
    const match = queryRegex.exec(content)

    if (match) {
      const name = match[1]
      const variablesStr = match[2]

      // Parse variables if present
      const variables: Array<string> = []
      if (variablesStr) {
        const varRegex = /\$(\w+):/g
        let varMatch
        while ((varMatch = varRegex.exec(variablesStr)) !== null) {
          variables.push(varMatch[1])
        }
      }

      return {
        name,
        query: content,
        variables: variables.length > 0 ? variables : undefined
      }
    }

    // Fallback: use filename as query name if no named query found
    return { name: fallbackName, query: content }
  }

  static getQuery(name: string): Effect.Effect<Query, Error> {
    return Effect.sync(() => {
      const query = this.queries.get(name)
      if (!query) {
        throw new Error(`Query "${name}" not found. Available queries: ${Array.from(this.queries.keys()).join(", ")}`)
      }
      return query
    })
  }
}
