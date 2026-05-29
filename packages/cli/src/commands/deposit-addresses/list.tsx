import {
  type ConfiguredDepositAddress,
  type IDepositAddressResource,
  runDepositAddressesList,
} from '@inflowpayai/inflow-core';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import type React from 'react';
import { useCallback } from 'react';
import { useFlowState } from '../../hooks/use-flow-state.js';
import { Table, type TableColumn } from '../../utils/table.js';

export interface DepositAddressesListProps {
  depositAddressResource: Pick<IDepositAddressResource, 'list'>;
  onComplete: (result: ConfiguredDepositAddress[] | null) => void;
}

const COLUMNS: ReadonlyArray<TableColumn<ConfiguredDepositAddress>> = [
  { header: 'Blockchain', cell: (a) => a.blockchain },
  { header: 'Address', cell: (a) => a.address },
  { header: 'Currencies', cell: (a) => a.currencies.join(', ') },
];

export const DepositAddressesList: React.FC<DepositAddressesListProps> = ({ depositAddressResource, onComplete }) => {
  const { exit } = useApp();

  const action = useCallback(() => runDepositAddressesList({ depositAddressResource }), [depositAddressResource]);

  const handleLinger = useCallback(
    (result: ConfiguredDepositAddress[] | null) => {
      onComplete(result);
      exit();
    },
    [onComplete, exit],
  );

  const { status, data: addresses, error } = useFlowState(action, handleLinger);

  if (status === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Loading deposit addresses...
        </Text>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">✗ Failed to retrieve deposit addresses</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (addresses === null) return null;

  if (addresses.length === 0) {
    return <Text dimColor>No configured deposit addresses.</Text>;
  }

  return <Table columns={COLUMNS} rows={addresses} />;
};
