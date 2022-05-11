import { NETWORK_TO_NAME_MAP,CHAIN_ID_TO_RPC_URL_MAP,CHAIN_ID_TO_NETWORK_ID_MAP} from '../../shared/constants/network';

export class TransactionPreviewController {
  blockTracker;
  preferencesController;
  
  constructor(blockTracker, preferencesController) {
    this.blockTracker = blockTracker;
    this.preferencesController = preferencesController;
  }

  getTransactionPreviewData(tx) {
    const latestBlock = this.blockTracker.getCurrentBlock();
    const {
      chainId,
      txParams
    } = tx;
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

    const params = [`networkId=${networkId}`,
    `rpcUrl=${encodeURIComponent(rpcUrl)}`,
    `blockNumber=${latestBlock}`,
    `chainId=${chainId}`,
    `maxPriorityFeePerGas=${txParams.maxPriorityFeePerGas}`,
    `maxFeePerGas=${txParams.maxFeePerGas}`,
    `gas=${txParams.gas}`,
    `data=${txParams.data}`,
    `value=${txParams.value}`,
    `from=${txParams.from}`];
    if (txParams.to) {
      params.push(`to=${txParams.to}`);
    }

    let previewQuery = params.join("&");

    if (txParams.from) {
      previewQuery += `&from=${txParams.from}`;
    }

    return {
      previewQuery,
      networkName: NETWORK_TO_NAME_MAP[chainId],
      latestBlockNumber: Number(latestBlock).toString(10).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    };

  }
}