import { decodeHeader, type DecodedHeader, summarizeAccepts } from '@inflowpayai/inflow-core';
import { fromFoundationRequirements } from '@inflowpayai/x402-buyer';
import { Box, Text } from 'ink';
import type React from 'react';

export { decodeHeader, type DecodedHeader, summarizeAccepts };

export interface DecodeViewProps {
  decoded: DecodedHeader;
}

export const DecodeView: React.FC<DecodeViewProps> = ({ decoded }) => {
  const summary = summarizeAccepts(fromFoundationRequirements(decoded.accepts));
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>Decoded PAYMENT-REQUIRED</Text>
      </Box>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
        <Text>
          {'x402Version: '}
          <Text color="cyan">{String(decoded.x402Version)}</Text>
        </Text>
        <Text>
          {'resource: '}
          <Text color="cyan">{decoded.resource.url}</Text>
        </Text>
        <Text>{`accepts (${String(summary.length)}):`}</Text>
        {summary.map((entry, idx) => (
          <Text key={`${entry.scheme}-${entry.network}-${String(idx)}`}>
            {'  '}
            <Text color="yellow">{entry.scheme}</Text>
            {' / '}
            <Text color="yellow">{entry.network}</Text>
            {entry.amount !== undefined ? ` · amount ${entry.amount}` : ''}
            {entry.asset !== undefined ? ` · ${entry.asset}` : ''}
          </Text>
        ))}
        {decoded.extensions !== undefined ? (
          <Text dimColor>{`extensions: ${Object.keys(decoded.extensions).join(', ')}`}</Text>
        ) : null}
      </Box>
    </Box>
  );
};
