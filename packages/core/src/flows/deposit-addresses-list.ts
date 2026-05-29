import type { IDepositAddressResource } from '../resources/interfaces.js';
import type { ConfiguredDepositAddress } from '../types/index.js';

export interface DepositAddressesListInput {
  depositAddressResource: Pick<IDepositAddressResource, 'list'>;
}

/**
 * Returns only the _configured_ deposit addresses. The underlying resource returns both configured and unconfigured
 * arrays; the CLI's agent contract deliberately omits `unconfigured` from the payload and this flow preserves that
 * contract for SDK consumers.
 *
 * If a consumer needs the full server response (including the unconfigured array), they can call
 * `inflow.depositAddresses.list()` directly.
 */
export async function runDepositAddressesList(input: DepositAddressesListInput): Promise<ConfiguredDepositAddress[]> {
  const { configured } = await input.depositAddressResource.list();
  return configured;
}
