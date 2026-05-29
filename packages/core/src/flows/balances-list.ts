import type { IBalanceResource } from '../resources/interfaces.js';
import type { Balance } from '../types/index.js';

export interface BalancesListInput {
  balanceResource: Pick<IBalanceResource, 'list'>;
}

export async function runBalancesList(input: BalancesListInput): Promise<Balance[]> {
  return input.balanceResource.list();
}
