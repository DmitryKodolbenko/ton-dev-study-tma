import {
  Asset,
  Factory,
  JettonRoot,
  MAINNET_FACTORY_ADDR,
  Pool,
  PoolType,
  VaultNative,
  VaultJetton,
  SwapParams,
  SwapStep,
  JettonWallet,
} from "@dedust/sdk";

import { Address, toNano, TonClient4, fromNano, Builder, Cell } from "@ton/ton";

export interface readyTonconnectTr {
  address: string;
  amount: string;
  payload: string;
}

export interface IBuildSwapMessage {
  amount: bigint;
  poolAddress: Address;
  queryId?: bigint | number;
  limit?: bigint;
  swapParams?: SwapParams;
  next?: SwapStep;
}

export interface IBuildSwapJettonToTonMessage {
  queryId?: number | bigint;
  destination: Address;
  amount: bigint;
  responseAddress?: Address | null;
  customPayload?: Cell;
  forwardAmount?: bigint;
  forwardPayload?: Cell;
}

export function formatNumber(amount: string): string {
  const amountAsNumber = parseFloat(amount);

  if (amountAsNumber > 0.01) {
    const formattedValue = amount.toString();
    const index = formattedValue.indexOf(".");

    if (index !== -1 && formattedValue.length - index > 2) {
      return formattedValue.slice(0, index + 3);
    }
    return formattedValue;
  }

  const formattedValue = amount.toLocaleString();

  return formattedValue
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.$/, "")
    .slice(0, 8);
}

export class DedustSwapService {
  private readonly client: TonClient4;

  constructor(client: TonClient4) {
    this.client = client;
  }

  protected static packSwapStep({ poolAddress, limit, next }: SwapStep): Cell {
    const res = new Builder()
      .storeAddress(poolAddress)
      .storeUint(0, 1) // reserved
      .storeCoins(limit ?? 0n)
      .storeMaybeRef(next ? this.packSwapStep(next) : null)
      .endCell();

    return res;
  }

  protected static packSwapParams({
    deadline,
    recipientAddress,
    referralAddress,
    fulfillPayload,
    rejectPayload,
  }: SwapParams): Cell {
    const res = new Builder()
      .storeUint(deadline ?? 0, 32)
      .storeAddress(recipientAddress ?? null)
      .storeAddress(referralAddress ?? null)
      .storeMaybeRef(fulfillPayload)
      .storeMaybeRef(rejectPayload)
      .endCell();

    return res;
  }

  public static buildSwapMessageTonToJetton({
    amount,
    poolAddress,
    queryId,
    limit,
    swapParams,
    next,
  }: IBuildSwapMessage): Cell {
    const body = new Builder()
      .storeUint(VaultNative.SWAP, 32)
      .storeUint(queryId ?? 0, 64)
      .storeCoins(amount)
      .storeAddress(poolAddress)
      .storeUint(0, 1)
      .storeCoins(limit ?? 0)
      .storeMaybeRef(next ? this.packSwapStep(next) : null)
      .storeRef(this.packSwapParams(swapParams ?? {}))
      .endCell();

    return body;
  }

  public static buildSwapMessageJettonWallet({
    amount,
    queryId,
    destination,
    responseAddress,
    customPayload,
    forwardAmount,
    forwardPayload,
  }: IBuildSwapJettonToTonMessage): Cell {
    const body = new Builder()
      .storeUint(JettonWallet.TRANSFER, 32)
      .storeUint(queryId ?? 0, 64)
      .storeCoins(amount)
      .storeAddress(destination)
      .storeAddress(responseAddress)
      .storeMaybeRef(customPayload)
      .storeCoins(forwardAmount ?? 0)
      .storeMaybeRef(forwardPayload)
      .endCell();

    return body;
  }

  public async SwapTonToJetton(
    tokenAddress: string,
    tonAmountIn: string
  ): Promise<readyTonconnectTr | undefined> {
    const tonClient = this.client;

    const factory = tonClient.open(
      Factory.createFromAddress(MAINNET_FACTORY_ADDR)
    );

    const jetton = tonClient.open(
      JettonRoot.createFromAddress(Address.parse(tokenAddress))
    );

    const pool = tonClient.open(
      Pool.createFromAddress(
        await factory.getPoolAddress({
          poolType: PoolType.VOLATILE,
          assets: [Asset.native(), Asset.jetton(jetton.address)],
        })
      )
    );

    const nativeVault = tonClient.open(
      VaultNative.createFromAddress(
        await factory.getVaultAddress(Asset.native())
      )
    );

    const lastBlock = await tonClient.getLastBlock();
    const poolState = await tonClient.getAccountLite(
      lastBlock.last.seqno,
      pool.address
    );

    const vaultState = await tonClient.getAccountLite(
      lastBlock.last.seqno,
      nativeVault.address
    );

    const amountIn = toNano(tonAmountIn);

    const { amountOut: expectedAmoutOut } = await pool.getEstimatedSwapOut({
      assetIn: Asset.native(),
      amountIn,
    });

    // Slippage handling (1%)
    const minAmountOut = (expectedAmoutOut * 99n) / 100n;

    try {

        if (poolState.account.state.type !== 'active') {
            throw new Error('Pool not exist')
        }

        if (vaultState.account.state.type !== 'active') {
            throw new Error('Native Vault not exist')
        }

        const swapBody = DedustSwapService.buildSwapMessageTonToJetton({
            amount: amountIn,
            poolAddress: pool.address,
            limit: minAmountOut
        })

        return ({
            address: nativeVault.address.toString(),
            amount: (amountIn + toNano('0.5')).toString(),
            payload: swapBody.toBoc().toString('base64')
        })
    } catch (error) {
      console.error();
      return undefined;
    }
  }

  public async SwapJettonToTon(
    tokenAddress: string,
    jettonAmountIn: string,
    decimals: number,
    userAddress: string
  ): Promise<readyTonconnectTr | undefined> {
    return undefined;
  }

  public async SwapJettonToJetton(
    userAddress: string,
    tokenAddress1: string,
    tokenAddress2: string,
    jettonAmountIn: string,
    decimals: number
  ): Promise<readyTonconnectTr | undefined> {
    return undefined;
  }

  public async getEstimateSwapOut(
    tokenName1: string,
    tokenName2: string,
    tokenAmount1: string,
    tokenAddress1: string,
    tokenAddress2: string,
    decimals1: number,
    decimals2: number
  ): Promise<string> {
    if (tokenAmount1 === "0" || tokenAmount1 === "0.") {
      return "0";
    }

    if (tokenAmount1 === "") {
      return "";
    }

    return "";
  }
}
