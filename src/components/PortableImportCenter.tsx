import type { ComponentProps } from 'react';
import { ImportCenterDialog } from './ImportCenterDialog';
import { portableImportCenterAdapter } from './portableImportAdapter';

type PortableImportCenterProps = Omit<ComponentProps<typeof ImportCenterDialog>, 'adapter'>;

/** Lazy boundary keeps PDF/import workflow code out of the initial editor bundle. */
export const PortableImportCenter = (props: PortableImportCenterProps) => (
  <ImportCenterDialog {...props} adapter={portableImportCenterAdapter} />
);
