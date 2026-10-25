import { build } from 'tsup';

/** Builds dist/ once so integration tests always run the current sources. */
export default async function setup(): Promise<void> {
  await build({ silent: true });
}
