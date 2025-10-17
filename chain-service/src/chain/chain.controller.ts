import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ChainService } from './chain.service';

@Controller('chain')
export class ChainController {
  constructor(private readonly chainService: ChainService) {}

  @Get('balance')
  async getBalance(@Query('address') address: string) {
    return this.chainService.getBalance(address);
  }

  @Get('txs')
  async getTxs(@Query('address') address: string, @Query('limit') limit = '10') {
    return this.chainService.getTxs(address, parseInt(limit, 10));
  }

  @Get('erc20/txs')
  async getErc20Txs(@Query('address') address: string, @Query('token') token: string) {
    return this.chainService.getErc20Txs(address, token);
  }

  @Post('transfer/eth')
  async transferEth(
    @Body()
    body: {
      // preferred: client provides a fully signed raw transaction
      signedTx?: string;
      // legacy / dev fallback (not recommended): server will sign and send using private key
      fromPrivateKey?: string;
      to?: string;
      amount?: string;
      // optional declared sender address, used only to validate ownership against signedTx when provided
      fromAddress?: string;
    },
  ) {
    if (body.signedTx) return this.chainService.sendSignedTransaction(body.signedTx, body.fromAddress);
    if (body.fromPrivateKey) return this.chainService.transferEthWithPrivateKey(body.fromPrivateKey, body.to, body.amount);
    return { error: 'signedTx or fromPrivateKey required' };
  }

  // Custodial transfer: server signs using stored private key for the owner's address
  @Post('transfer/eth/custodial')
  async custodialTransferEth(
    @Body()
    body: {
      ownerId: string; // application user id who owns the address
      fromAddress: string;
      to: string;
      amount: string;
    },
  ) {
    return this.chainService.custodialTransferEth(body.ownerId, body.fromAddress, body.to, body.amount);
  }

  @Post('transfer/erc20')
  async transferErc20(
    @Body()
    body: {
      signedTx?: string;
      fromPrivateKey?: string;
      to?: string;
      amount?: string;
      tokenAddress?: string;
      fromAddress?: string;
    },
  ) {
    if (body.signedTx) return this.chainService.sendSignedTransaction(body.signedTx, body.fromAddress);
    if (body.fromPrivateKey)
      return this.chainService.transferErc20WithPrivateKey(body.fromPrivateKey, body.to, body.amount, body.tokenAddress);
    return { error: 'signedTx or fromPrivateKey required' };
  }

  @Post('transfer/erc20/custodial')
  async custodialTransferErc20(
    @Body()
    body: {
      ownerId: string;
      fromAddress: string;
      to: string;
      amount: string;
      tokenAddress: string;
    },
  ) {
    return this.chainService.custodialTransferErc20(body.ownerId, body.fromAddress, body.to, body.amount, body.tokenAddress);
  }

  @Post('erc20/mint')
  async mintErc20(
    @Body()
    body: {
      adminApiKey?: string; // preferred: API key to authenticate admin
      adminPrivateKey?: string; // fallback if API key not used
      tokenAddress?: string;
      to?: string;
      amount?: string;
    },
  ) {
    return this.chainService.mintErc20Authorized(body.adminApiKey, body.adminPrivateKey, body.tokenAddress, body.to, body.amount);
  }

  @Post('erc20/burn')
  async burnErc20(
    @Body()
    body: {
      adminApiKey?: string;
      adminPrivateKey?: string;
      tokenAddress?: string;
      from?: string;
      amount?: string;
    },
  ) {
    return this.chainService.burnErc20Authorized(body.adminApiKey, body.adminPrivateKey, body.tokenAddress, body.from, body.amount);
  }
}
