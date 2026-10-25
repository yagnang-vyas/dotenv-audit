/**
 * Browser stand-in for `node:fs/promises`. The engine only reaches it through
 * the CLI's `loadSchemaFile`, which the web app never calls; the playground
 * passes schema text to `parseSchema` instead. Throwing keeps a mistake loud.
 */
export function readFile(): Promise<never> {
  return Promise.reject(new Error('file system access is not available in the browser'));
}
