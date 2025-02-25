import { TokenHolder } from '../crawler/types';
import { insertV2 } from '../utils/connector';
import logger from '../utils/logger';
import { dropDuplicatesMultiKey } from '../utils/utils';

const TOKEN_HOLDER_INSERT_STATEMENT = `
INSERT INTO token_holder
  (signer, evm_address, type, token_address, nft_id, balance, info, timestamp)
VALUES
  %L`;

const DO_UPDATE = ` balance = EXCLUDED.balance,
  timestamp = EXCLUDED.timestamp,
  info = EXCLUDED.info;`;

const toTokenHolder = ({
  signerAddress,
  balance,
  tokenAddress,
  info,
  evmAddress,
  type,
  timestamp,
  nftId,
}: TokenHolder): any[] => [signerAddress === '' ? null : signerAddress, evmAddress === '' ? null : evmAddress, type, tokenAddress, nftId, balance, JSON.stringify(info !== null ? info : {}), timestamp];

export const insertAccountTokenHolders = async (tokenHolders: TokenHolder[]): Promise<void> => insertV2(
  `${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (signer, token_address) WHERE evm_address IS NULL AND nft_id IS NULL DO UPDATE SET
    ${DO_UPDATE}
  `,
  tokenHolders.map(toTokenHolder),
);

export const insertContractTokenHolders = async (tokenHolders: TokenHolder[]): Promise<void> => insertV2(
  `${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (evm_address, token_address) WHERE signer IS NULL AND nft_id IS NULL DO UPDATE SET
    ${DO_UPDATE}
  `,
  tokenHolders.map(toTokenHolder),
);

export const insertAccountNftHolders = async (tokenHolders: TokenHolder[]): Promise<void> => insertV2(
  `${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (signer, token_address, nft_id) WHERE evm_address IS NULL AND nft_id IS NOT NULL DO UPDATE SET
    ${DO_UPDATE}
  `,
  tokenHolders.map(toTokenHolder),
);

export const insertContractNftHolders = async (tokenHolders: TokenHolder[]): Promise<void> => insertV2(
  `${TOKEN_HOLDER_INSERT_STATEMENT}
    ON CONFLICT (evm_address, token_address, nft_id) WHERE signer IS NULL AND nft_id IS NOT NULL DO UPDATE SET
    ${DO_UPDATE}
  `,
  tokenHolders.map(toTokenHolder),
);

export default async (tokenHolders: TokenHolder[]): Promise<void> => {
  logger.info('Inserting account nft holders');
  await insertAccountNftHolders(
    dropDuplicatesMultiKey(
      tokenHolders.filter(({ type, nftId }) => type === 'Account' && nftId !== null),
      ['signerAddress', 'tokenAddress', 'nftId'],
    ),
  );
  logger.info('Inserting contract nft holders');
  await insertContractNftHolders(
    dropDuplicatesMultiKey(
      tokenHolders.filter(({ type, nftId }) => type === 'Contract' && nftId !== null),
      ['evmAddress', 'tokenAddress', 'nftId'],
    ),
  );
  logger.info('Inserting account token holders');
  await insertAccountTokenHolders(
    dropDuplicatesMultiKey(
      tokenHolders.filter(({ type, nftId }) => type === 'Account' && nftId === null),
      ['signerAddress', 'tokenAddress'],
    ),
  );
  logger.info('Inserting contract token holders');
  await insertContractTokenHolders(
    dropDuplicatesMultiKey(
      tokenHolders.filter(({ type, nftId }) => type === 'Contract' && nftId === null),
      ['evmAddress', 'tokenAddress'],
    ),
  );
};
