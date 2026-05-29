import { Box, Text, useInput } from 'ink';
import type React from 'react';

export interface LoginPromptProps {
  userDisplay: string;
  onAccept: () => void;
  onReject: () => void;
}

export const LoginPrompt: React.FC<LoginPromptProps> = ({ userDisplay, onAccept, onReject }) => {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onAccept();
      return;
    }
    if (input === 'n' || input === 'N' || key.return || key.escape) {
      onReject();
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="green">{`✓ Already signed in as ${userDisplay}`}</Text>
      <Box marginTop={1}>
        <Text>Re-authenticate? [y/N]</Text>
      </Box>
    </Box>
  );
};
