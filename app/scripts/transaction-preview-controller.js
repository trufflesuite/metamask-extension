import { NETWORK_TO_NAME_MAP,CHAIN_ID_TO_RPC_URL_MAP,CHAIN_ID_TO_NETWORK_ID_MAP} from '../../shared/constants/network';
import { isEIP1559Transaction } from '../../shared/modules/transaction.utils';
import { TRANSACTION_ENVELOPE_TYPES } from '../../shared/constants/transaction';
import * as txUtils from './controllers/transactions/lib/util';

export class TransactionPreviewController {
  blockTracker;
  preferencesController;
  
  constructor(blockTracker, preferencesController, getNonceForAccount) {
    this.blockTracker = blockTracker;
    this.preferencesController = preferencesController;
    this.getNonceForAccount = getNonceForAccount;
  }

  async getTransactionPreviewData(tx) {
    await this.blockTracker.checkForLatestBlock();

    const latestBlock = this.blockTracker.getCurrentBlock();
    const { chainId, txParams } = tx;
    let rpcUrl = CHAIN_ID_TO_RPC_URL_MAP[chainId],
        networkId = CHAIN_ID_TO_NETWORK_ID_MAP[chainId];

    if (rpcUrl === undefined || networkId === undefined) {
      const customRpcList = this.preferencesController.getFrequentRpcListDetail();
      const rpcSettings = customRpcList.find((rpc) => txMeta.chainId === rpc.chainId);
      if (rpcSettings) {
        networkId = rpcSettings.rpcPrefs.networkId;
        rpcUrl = rpcSettings.rpcPrefs.rpcUrl;
      }
    }
    const nonce = await this.getNonceForAccount(txParams.from) + 1;

    const txObj = getTxObject(txParams, chainId, nonce);
    const previewQuery = [
    `networkId=${networkId}`,
    `rpcUrl=${encodeURIComponent(rpcUrl)}`,
    `blockNumber=${latestBlock}`,
    `chainId=${chainId}`,
    `tx=${JSON.stringify(txObj)}`].join("&");

    return {
      previewQuery,
      networkName: NETWORK_TO_NAME_MAP[chainId],
      latestBlockNumber: Number(latestBlock).toString(10).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    };
  }
}

function getTxObject(txParams, chainId, nonce) {
  const normalizedTxParams = txUtils.normalizeTxParams(txParams);
  // add network/chain id
  const type = isEIP1559Transaction({ txParams: normalizedTxParams })
    ? TRANSACTION_ENVELOPE_TYPES.FEE_MARKET
    : TRANSACTION_ENVELOPE_TYPES.LEGACY;
  const tx = {
    ...normalizedTxParams,
    type,
    gasLimit: normalizedTxParams.gas,
    chainId,
    nonce
  };
  if (tx.to === undefined) {
    delete tx.to;
  };

  return tx;
}
