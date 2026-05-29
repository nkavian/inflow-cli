import type { IAuth } from '@inflowpayai/inflow-core';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import type React from 'react';
import { useCallback } from 'react';
import { useFlowState } from '../../hooks/use-flow-state.js';

export interface LogoutProps {
  auth: IAuth;
  onComplete: () => void;
}

export const Logout: React.FC<LogoutProps> = ({ auth, onComplete }) => {
  const { exit } = useApp();
  const action = useCallback(() => auth.logout(), [auth]);
  const handleComplete = useCallback(() => {
    onComplete();
    exit();
  }, [onComplete, exit]);
  const { status } = useFlowState(action, handleComplete);

  if (status === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Logging out...
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color="green">✓ Logged out successfully</Text>
    </Box>
  );
};
