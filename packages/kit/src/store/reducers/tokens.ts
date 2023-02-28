import { createSlice } from '@reduxjs/toolkit';
import { uniqBy } from 'lodash';

import type { Token } from '@onekeyhq/engine/src/types/token';

import type { PayloadAction } from '@reduxjs/toolkit';

export type TokenBalanceValue =
  | {
      balance: string;
      blockHeight?: string;
    }
  | undefined;
export type TokenChartData = [number, number][];

export type PriceLoading = undefined;
export type NoPriceData = null;
export type TokenPrices = Record<TokenId, string | PriceLoading | NoPriceData>;
export type SimpleTokenPrices = Record<
  string,
  number | PriceLoading | NoPriceData
>;

type NetworkId = string;
type AccountId = string;
type TokenId = string;
type PriceId = string; // networkid-contractAddress

export type SimplifiedToken = {
  tokenIdOnNetwork: string;
  sendAddress?: string;
  autoDetected?: boolean;
};

export type TokenInitialState = {
  tokenPriceMap: Record<PriceId, SimpleTokenPrices>;
  accountTokens: Record<NetworkId, Record<TokenId, Token[]>>;
  accountTokensBalance: Record<
    NetworkId,
    Record<AccountId, Record<TokenId, TokenBalanceValue>>
  >;
};

const initialState: TokenInitialState = {
  tokenPriceMap: {},
  accountTokens: {},
  accountTokensBalance: {},
} as const;

type TokenPayloadAction = {
  activeAccountId?: string | null;
  activeNetworkId?: string | null;
  tokens: Token[];
};

type TokenBalancePayloadAction = {
  activeAccountId?: string | null;
  activeNetworkId?: string | null;
  tokensBalance: Record<string, TokenBalanceValue>;
};

type TokenPrivePayloadAction = {
  prices: Record<string, SimpleTokenPrices>;
  vsCurrency: string;
};

export const tokensSlice = createSlice({
  name: 'tokens',
  initialState,
  reducers: {
    setTokenPriceMap(state, action: PayloadAction<TokenPrivePayloadAction>) {
      const { prices, vsCurrency } = action.payload;
      if (!state.tokenPriceMap) state.tokenPriceMap = {};
      Object.keys(prices).forEach((key) => {
        const cachePrice = state.tokenPriceMap[key] || {};
        state.tokenPriceMap[key] = {
          ...cachePrice,
          ...prices[key],
          [`updatedAt--${vsCurrency}`]: Date.now(),
        };
      });
    },
    setAccountTokens(state, action: PayloadAction<TokenPayloadAction>) {
      const { activeAccountId, activeNetworkId, tokens } = action.payload;
      if (!activeAccountId || !activeNetworkId) {
        return;
      }
      if (!state.accountTokens[activeNetworkId]) {
        state.accountTokens[activeNetworkId] = {};
      }
      state.accountTokens[activeNetworkId][activeAccountId] = uniqBy(
        tokens.filter((t, _i, arr) => {
          if (
            !t.sendAddress &&
            arr.some(
              (token) => token.sendAddress && token.address === t.address,
            )
          ) {
            return false;
          }
          return true;
        }),
        (t) => `${t.tokenIdOnNetwork}-${t.sendAddress ?? ''}`,
      );
    },
    setAccountTokensBalances(
      state,
      action: PayloadAction<TokenBalancePayloadAction>,
    ) {
      const { activeAccountId, activeNetworkId, tokensBalance } =
        action.payload;
      if (!activeAccountId || !activeNetworkId) {
        return;
      }
      if (!state.accountTokensBalance[activeNetworkId]) {
        state.accountTokensBalance[activeNetworkId] = {};
      }
      const oldTokensBalance =
        state.accountTokensBalance[activeNetworkId][activeAccountId] || {};
      // native token balance defaults to 0
      oldTokensBalance.main = oldTokensBalance.main ?? {
        balance: '0',
      };

      state.accountTokensBalance[activeNetworkId][activeAccountId] = {
        ...oldTokensBalance,
        ...tokensBalance,
      };
    },
  },
});

export const { setTokenPriceMap, setAccountTokens, setAccountTokensBalances } =
  tokensSlice.actions;
export default tokensSlice.reducer;
