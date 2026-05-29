import type { User } from '../types/index.js';

const ACCESS_TOKEN_PREVIEW_LENGTH = 20;

export function describeUser(user: User): string {
  if (user.email !== null) return user.email;
  if (user.username !== null) return user.username;
  if (user.firstName !== null && user.lastName !== null) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.userId;
}

export function previewAccessToken(token: string): string {
  return `${token.substring(0, ACCESS_TOKEN_PREVIEW_LENGTH)}...`;
}
