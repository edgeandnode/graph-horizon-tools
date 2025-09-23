import { Console, Effect } from "effect"

export class Display {
  // ANSI color codes
  static colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    bgBlue: "\x1b[44m",
    bgGreen: "\x1b[42m"
  }

  static colorize(text: string, color: keyof typeof Display.colors): string {
    return `${Display.colors[color]}${text}${Display.colors.reset}`
  }

  static header(title: string): Effect.Effect<void, never> {
    const line = "═".repeat(50)
    return Effect.gen(function*() {
      yield* Console.log("")
      yield* Console.log(Display.colorize(line, "cyan"))
      yield* Console.log(Display.colorize(`  ${title}`, "bright"))
      yield* Console.log(Display.colorize(line, "cyan"))
    })
  }

  static success(message: string): Effect.Effect<void, never> {
    return Console.log(Display.colorize(`✅ ${message}`, "green"))
  }

  static info(message: string): Effect.Effect<void, never> {
    return Console.log(Display.colorize(`ℹ️  ${message}`, "blue"))
  }

  static warning(message: string): Effect.Effect<void, never> {
    return Console.log(Display.colorize(`⚠️  ${message}`, "yellow"))
  }

  static error(message: string): Effect.Effect<void, never> {
    return Console.log(Display.colorize(`❌ ${message}`, "red"))
  }

  static keyValue(key: string, value: string | bigint | number): Effect.Effect<void, never> {
    const formattedKey = Display.colorize(key.padEnd(20), "cyan")
    const formattedValue = Display.colorize(String(value), "white")
    return Console.log(`  ${formattedKey} ${formattedValue}`)
  }

  static section(title: string): Effect.Effect<void, never> {
    return Effect.gen(function*() {
      yield* Console.log("")
      yield* Console.log(Display.colorize(`📊 ${title}`, "magenta"))
      yield* Console.log(Display.colorize("─".repeat(30), "dim"))
    })
  }

  static table<T extends Record<string, any>>(data: T): Effect.Effect<void, never> {
    return Effect.gen(function*() {
      for (const [key, value] of Object.entries(data)) {
        const formattedKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
        yield* Display.keyValue(formattedKey, value)
      }
    })
  }

  static bigNumber(label: string, value: bigint): Effect.Effect<void, never> {
    // Format big numbers with commas
    const formatted = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return Display.keyValue(label, formatted)
  }

  static spinner(message: string): Effect.Effect<void, never> {
    return Console.log(Display.colorize(`⏳ ${message}`, "yellow"))
  }

  static divider(): Effect.Effect<void, never> {
    return Console.log(Display.colorize("▔".repeat(50), "dim"))
  }
}
