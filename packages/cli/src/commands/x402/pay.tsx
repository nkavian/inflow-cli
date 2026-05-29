import {
  buildBodyAttachment,
  buildNoFilteredMatchMessage,
  buildSettledMeta,
  filterAccepts,
  INVALID_402_CODE,
  isSuccessStatus,
  mapSdkError,
  NO_FILTERED_MATCH_CODE,
  NO_INFLOW_MATCH_CODE,
  NO_INFLOW_MATCH_MESSAGE,
  PAYMENT_NOT_ACCEPTED_CODE,
  type PayEvent,
  type PayPhase,
  type PayPipelineDeps,
  type PayResultNoPayment,
  type PayResultReplayRejected,
  type PaySettledMeta,
  type PayResultSuccess,
  reducePay,
  runPayPipeline,
  UNEXPECTED_PROBE_STATUS_CODE,
} from '@inflowpayai/inflow-core';
import { Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type React from 'react';
import { useEffect, useReducer } from 'react';
import { openUrl } from '../../utils/open-url.js';
import { summarizeAccepts } from './decode.js';

export {
  buildBodyAttachment,
  buildNoFilteredMatchMessage,
  buildSettledMeta,
  filterAccepts,
  INVALID_402_CODE,
  isSuccessStatus,
  mapSdkError,
  NO_FILTERED_MATCH_CODE,
  NO_INFLOW_MATCH_CODE,
  NO_INFLOW_MATCH_MESSAGE,
  PAYMENT_NOT_ACCEPTED_CODE,
  type PayEvent,
  type PayPhase,
  type PayPipelineDeps,
  type PayResultNoPayment,
  type PayResultReplayRejected,
  type PayResultSuccess,
  type PaySettledMeta,
  runPayPipeline,
  UNEXPECTED_PROBE_STATUS_CODE,
};

export interface PayViewProps {
  url: string;
  method: string;
  deps: PayPipelineDeps;
  onComplete: (final: PayPhase) => void;
}

export const PayView: React.FC<PayViewProps> = ({ url, method, deps, onComplete }) => {
  const { exit } = useApp();
  const initial: PayPhase = { kind: 'probing' };
  const [phase, dispatch] = useReducer(reducePay, initial);

  useInput(
    (_input, key) => {
      if (key.return && phase.kind === 'awaiting-approval') {
        openUrl(phase.approvalUrl);
      }
    },
    { isActive: phase.kind === 'awaiting-approval' },
  );

  useEffect(() => {
    let cancelled = false;
    void runPayPipeline(deps, (event: PayEvent) => {
      if (!cancelled) dispatch(event);
    });
    return () => {
      cancelled = true;
    };
  }, [deps]);

  useEffect(() => {
    if (
      phase.kind === 'success' ||
      phase.kind === 'replay-rejected' ||
      phase.kind === 'no-payment-final' ||
      phase.kind === 'error'
    ) {
      onComplete(phase);
      exit();
    }
  }, [phase, onComplete, exit]);

  if (phase.kind === 'probing') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Probing {method} {url}...
        </Text>
      </Box>
    );
  }

  if (phase.kind === 'no-payment') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Seller accepted without payment (status {String(phase.probe.status)}); finalising...
        </Text>
      </Box>
    );
  }

  if (phase.kind === 'matching') {
    return (
      <Box flexDirection="column">
        <Text color="cyan">
          <Spinner type="dots" /> Decoding seller requirements...
        </Text>
      </Box>
    );
  }

  if (phase.kind === 'preparing') {
    const summary = summarizeAccepts([phase.requirement]);
    return (
      <Box flexDirection="column">
        <Text color="cyan">
          <Spinner type="dots" /> Preparing payment ({summary[0]?.scheme ?? phase.requirement.scheme} /{' '}
          {summary[0]?.network ?? phase.requirement.network})...
        </Text>
      </Box>
    );
  }

  if (phase.kind === 'awaiting-approval') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold>Approval required</Text>
        </Box>
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
          <Text>
            {'Open: '}
            <Text bold color="cyan">
              {phase.approvalUrl}
            </Text>
          </Text>
          <Text dimColor>Press Enter to open in browser.</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="cyan">
            <Spinner type="dots" /> Waiting for approval...
          </Text>
        </Box>
      </Box>
    );
  }

  if (phase.kind === 'replaying') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Replaying request with PAYMENT-SIGNATURE...
        </Text>
      </Box>
    );
  }

  if (phase.kind === 'success') {
    const { result } = phase;
    return (
      <Box flexDirection="column">
        <Text color="green">
          ✓ Paid {result.scheme} / {result.network}
        </Text>
        <Text>{`status: ${String(result.responseStatus)}`}</Text>
        <Text>{`transaction: ${result.transactionId}`}</Text>
        {result.settled?.network !== undefined ? (
          <Text>{`settled via: ${result.settled.network}${result.settled.transaction !== undefined ? ` (${result.settled.transaction})` : ''}`}</Text>
        ) : null}
        <Text>{`response size: ${String(result.bodySizeBytes)} bytes`}</Text>
        {result.outputSavedTo !== undefined ? (
          <Text>
            {'Saved to: '}
            <Text bold>{result.outputSavedTo}</Text>
          </Text>
        ) : null}
        {result.body !== undefined ? (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>response body:</Text>
            <Text>{result.body}</Text>
          </Box>
        ) : null}
      </Box>
    );
  }

  if (phase.kind === 'replay-rejected') {
    const { result } = phase;
    return (
      <Box flexDirection="column">
        <Text color="red">
          ✗ Payment not accepted ({result.scheme} / {result.network})
        </Text>
        <Text>{`status: ${String(result.responseStatus)}`}</Text>
        <Text>{`transaction: ${result.transactionId}`}</Text>
        <Text>{`approval: ${result.approvalId}`}</Text>
        <Text>{`approval url: ${result.approvalUrl}`}</Text>
        <Text>{`response size: ${String(result.bodySizeBytes)} bytes`}</Text>
        {result.outputSavedTo !== undefined ? (
          <Text>
            {'Saved to: '}
            <Text bold>{result.outputSavedTo}</Text>
          </Text>
        ) : null}
        {result.body !== undefined ? (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>response body:</Text>
            <Text>{result.body}</Text>
          </Box>
        ) : null}
      </Box>
    );
  }

  if (phase.kind === 'no-payment-final') {
    const { result } = phase;
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Seller accepted without payment</Text>
        <Text>{`status: ${String(result.status)}`}</Text>
        <Text>{`response size: ${String(result.bodySizeBytes)} bytes`}</Text>
        {result.outputSavedTo !== undefined ? (
          <Text>
            {'Saved to: '}
            <Text bold>{result.outputSavedTo}</Text>
          </Text>
        ) : null}
        {result.body !== undefined ? (
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>response body:</Text>
            <Text>{result.body}</Text>
          </Box>
        ) : null}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="red">✗ {phase.code}</Text>
      <Text color="red">{phase.message}</Text>
    </Box>
  );
};
