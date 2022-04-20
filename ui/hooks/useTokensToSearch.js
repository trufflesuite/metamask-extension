import { useMemo } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { isEqual, uniqBy } from 'lodash';
import { getTokenFiatAmount } from '../helpers/utils/token-util';
import {
  getTokenExchangeRates,
  getCurrentCurrency,
  getSwapsDefaultToken,
  getCurrentChainId,
  getTokenList,
} from '../selectors';
import { getConversionRate } from '../ducks/metamask/metamask';

import { getSwapsTokens } from '../ducks/swaps/swaps';
import { isSwapsDefaultTokenSymbol } from '../../shared/modules/swaps.utils';
import { toChecksumHexAddress } from '../../shared/modules/hexstring-utils';
import { TOKEN_BUCKET_PRIORITY } from '../../shared/constants/swaps';
import { useEqualityCheck } from './useEqualityCheck';

export function getRenderableTokenData(
  token,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  chainId,
  tokenList,
) {
  const { symbol, name, address, iconUrl, string, balance, decimals } = token;
  const formattedFiat =
    getTokenFiatAmount(
      isSwapsDefaultTokenSymbol(symbol, chainId)
        ? 1
        : contractExchangeRates[toChecksumHexAddress(address)],
      conversionRate,
      currentCurrency,
      string,
      symbol,
      true,
    ) || '';
  const rawFiat =
    getTokenFiatAmount(
      isSwapsDefaultTokenSymbol(symbol, chainId)
        ? 1
        : contractExchangeRates[toChecksumHexAddress(address)],
      conversionRate,
      currentCurrency,
      string,
      symbol,
      false,
    ) || '';

  const usedIconUrl =
    iconUrl || tokenList[address?.toLowerCase()]?.iconUrl || token?.image;

  return {
    ...token,
    primaryLabel: symbol,
    secondaryLabel: name || tokenList[address?.toLowerCase()]?.name,
    rightPrimaryLabel:
      string && `${new BigNumber(string).round(6).toString()} ${symbol}`,
    rightSecondaryLabel: formattedFiat,
    iconUrl: usedIconUrl,
    identiconAddress: usedIconUrl ? null : address,
    balance,
    decimals,
    name: name || tokenList[address?.toLowerCase()]?.name,
    rawFiat,
  };
}

export function useTokensToSearch({
  usersTokens = [],
  topTokens = {},
  shuffledTokensList,
  tokenBucketPriority = TOKEN_BUCKET_PRIORITY.OWNED,
}) {
  const chainId = useSelector(getCurrentChainId);
  const tokenConversionRates = useSelector(getTokenExchangeRates, isEqual);
  const conversionRate = useSelector(getConversionRate);
  const currentCurrency = useSelector(getCurrentCurrency);
  const defaultSwapsToken = useSelector(getSwapsDefaultToken, shallowEqual);
  const tokenList = useSelector(getTokenList, isEqual);
  const memoizedTopTokens = useEqualityCheck(topTokens);
  const memoizedUsersToken = useEqualityCheck(usersTokens);

  const defaultToken = getRenderableTokenData(
    defaultSwapsToken,
    tokenConversionRates,
    conversionRate,
    currentCurrency,
    chainId,
    tokenList,
  );
  const memoizedDefaultToken = useEqualityCheck(defaultToken);

  const swapsTokens = useSelector(getSwapsTokens, isEqual) || [];

  const tokensToSearch = swapsTokens.length
    ? swapsTokens
    : [
        memoizedDefaultToken,
        ...shuffledTokensList.filter(
          (token) => token.symbol !== memoizedDefaultToken.symbol,
        ),
      ];

  const memoizedTokensToSearch = useEqualityCheck(tokensToSearch);
  return useMemo(() => {
    const usersTokensAddressMap = memoizedUsersToken.reduce(
      (acc, token) => ({ ...acc, [token.address.toLowerCase()]: token }),
      {},
    );

    const tokensToSearchBuckets = {
      owned: [],
      top: [],
      others: [],
    };

    const memoizedSwapsAndUserTokensWithoutDuplicities = uniqBy(
      [memoizedDefaultToken, ...memoizedTokensToSearch, ...memoizedUsersToken],
      (token) => token.address.toLowerCase(),
    );

    memoizedSwapsAndUserTokensWithoutDuplicities.forEach((token) => {
      const renderableDataToken = getRenderableTokenData(
        { ...usersTokensAddressMap[token.address.toLowerCase()], ...token },
        tokenConversionRates,
        conversionRate,
        currentCurrency,
        chainId,
        tokenList,
      );
      if (tokenBucketPriority === TOKEN_BUCKET_PRIORITY.OWNED) {
        if (
          isSwapsDefaultTokenSymbol(renderableDataToken.symbol, chainId) ||
          usersTokensAddressMap[token.address.toLowerCase()]
        ) {
          tokensToSearchBuckets.owned.push(renderableDataToken);
        } else if (memoizedTopTokens[token.address.toLowerCase()]) {
          tokensToSearchBuckets.top[
            memoizedTopTokens[token.address.toLowerCase()].index
          ] = renderableDataToken;
        } else {
          tokensToSearchBuckets.others.push(renderableDataToken);
        }
      } else if (memoizedTopTokens[token.address.toLowerCase()]) {
        tokensToSearchBuckets.top[
          memoizedTopTokens[token.address.toLowerCase()].index
        ] = renderableDataToken;
      } else if (
        isSwapsDefaultTokenSymbol(renderableDataToken.symbol, chainId) ||
        usersTokensAddressMap[token.address.toLowerCase()]
      ) {
        tokensToSearchBuckets.owned.push(renderableDataToken);
      } else {
        tokensToSearchBuckets.others.push(renderableDataToken);
      }
    });

    tokensToSearchBuckets.owned = tokensToSearchBuckets.owned.sort(
      ({ rawFiat }, { rawFiat: secondRawFiat }) => {
        return new BigNumber(rawFiat || 0).gt(secondRawFiat || 0) ? -1 : 1;
      },
    );
    tokensToSearchBuckets.top = tokensToSearchBuckets.top.filter(Boolean);
    if (tokenBucketPriority === TOKEN_BUCKET_PRIORITY.OWNED) {
      return [
        ...tokensToSearchBuckets.owned,
        ...tokensToSearchBuckets.top,
        ...tokensToSearchBuckets.others,
      ];
    }
    return [
      ...tokensToSearchBuckets.top,
      ...tokensToSearchBuckets.owned,
      ...tokensToSearchBuckets.others,
    ];
  }, [
    memoizedTokensToSearch,
    memoizedUsersToken,
    tokenConversionRates,
    conversionRate,
    currentCurrency,
    memoizedTopTokens,
    memoizedDefaultToken,
    chainId,
    tokenList,
    tokenBucketPriority,
  ]);
}
