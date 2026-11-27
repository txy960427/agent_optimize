import { manifestFields } from '../../../shared/local-data-fields.mjs';
import type { Manifest } from '../../../shared/local-data';

type Field = (typeof manifestFields)[number];
type Missing = Exclude<keyof Manifest, Field>;
type Extra = Exclude<Field, keyof Manifest>;
type Exact = (Missing | Extra) extends never ? true : never;
export const manifestFieldsMatchManifest: Exact = true;
