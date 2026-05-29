import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import type React from 'react';
import { useCallback } from 'react';
import { useFlowState } from '../../hooks/use-flow-state.js';

export interface CancelViewProps {
  approvalId: string;
  cancel: () => Promise<void>;
  onComplete: () => void;
}

export const CancelView: React.FC<CancelViewProps> = ({ approvalId, cancel, onComplete }) => {
  const { exit } = useApp();
  const action = useCallback(() => cancel(), [cancel]);
  const handleComplete = useCallback(() => {
    onComplete();
    exit();
  }, [onComplete, exit]);
  const { status } = useFlowState(action, handleComplete);

  if (status === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Cancelling approval {approvalId}...
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color="green">✓ Cancelled approval {approvalId} (best-effort)</Text>
    </Box>
  );
};
