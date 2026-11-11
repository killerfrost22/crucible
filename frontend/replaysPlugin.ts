// Serves the recorded meetings in public/replays/*.sse to the pages that quote them, so a re-recorded file updates every
// quote. Three kinds of virtual module:
//   virtual:crucible-replays           RECORDINGS: when each recording was made, with which models, web search on or off
//   virtual:crucible-replays/<name>    one recording's content (src/lib/recording.ts), as separate named exports so a
//                                      page bundles only the fields it imports
//   virtual:crucible-featured/<name>   the home page's quotes from one recording, selected here at build time
//                                      (src/lib/featured.ts) so the home bundle carries only the sentences it shows
// Types: src/replays.d.ts. The files are parsed with the app's own SSE parser (src/lib/sse.ts).
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import { selectFeatured } from './src/lib/featured.ts'
import { readRecording } from './src/lib/recording.ts'
import { parseSseText } from './src/lib/sse.ts'

const REPLAYS = 'virtual:crucible-replays'
const FEATURED = 'virtual:crucible-featured/'

/** `JSON.parse` of a string literal is cheaper to parse than the same object literal, and as pure it tree-shakes. */
const json = (value: unknown) => `/* @__PURE__ */ JSON.parse(${JSON.stringify(JSON.stringify(value))})`

export function replaysPlugin(): Plugin {
  let dir = ''
  const read = (name: string) => readRecording(parseSseText(readFileSync(join(dir, `${name}.sse`), 'utf8')))

  return {
    name: 'crucible-replays',
    configResolved(config) {
      dir = join(config.publicDir, 'replays')
    },
    resolveId(id) {
      if (id === REPLAYS || id.startsWith(REPLAYS + '/') || id.startsWith(FEATURED)) return '\0' + id
    },
    load(id) {
      if (!id.startsWith('\0' + REPLAYS) && !id.startsWith('\0' + FEATURED)) return
      id = id.slice(1)
      if (id === REPLAYS) {
        const names = readdirSync(dir)
          .filter((f) => f.endsWith('.sse'))
          .map((f) => f.slice(0, -4))
          .sort()
        for (const name of names) this.addWatchFile(join(dir, `${name}.sse`))
        return `export const RECORDINGS = ${json(Object.fromEntries(names.map((name) => [name, read(name).meta])))}`
      }
      const [prefix, name] = id.startsWith(FEATURED) ? [FEATURED, id.slice(FEATURED.length)] : [REPLAYS, id.slice(REPLAYS.length + 1)]
      this.addWatchFile(join(dir, `${name}.sse`))
      const { data } = read(name)
      if (prefix === FEATURED) return `export default ${json(selectFeatured(name, data))}`
      return Object.entries(data)
        .map(([key, value]) => `export const ${key} = ${json(value)}`)
        .join('\n')
    },
    configureServer(server: ViteDevServer) {
      // public/ files aren't modules, so a changed recording would never reach the page on its own: drop the virtual
      // modules built from the recordings and reload.
      const onChange = (file: string) => {
        if (!file.endsWith('.sse') || relative(dir, dirname(file)) !== '') return
        const graph = server.environments.client.moduleGraph
        for (const mod of graph.idToModuleMap.values()) {
          if (mod.id?.startsWith('\0' + REPLAYS) || mod.id?.startsWith('\0' + FEATURED)) graph.invalidateModule(mod)
        }
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.add(dir)
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)
    },
  }
}
