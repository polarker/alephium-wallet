/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { convertAlphToSet } from '@alephium/sdk'
import { SignTransferTxResult } from 'alephium-web3'

import { Client } from '../../contexts/global'
import { useWalletConnectContext } from '../../contexts/walletconnect'
import BuildTransferTx, { BuildTransferTxData, BuildTransferTxProps } from './BuildTransferTx'
import CheckTransferTx from './CheckTransferTx'
import { TxContext, TxModalFactory } from './TxModal'

export type TransferTxModalProps = {
  initialTxData: BuildTransferTxProps['data']
  onClose: () => void
}

const TransferTxModal = ({ initialTxData, onClose }: TransferTxModalProps) => {
  console.log('============ refresh transfer')

  const buildTransaction = async (client: Client, transactionData: BuildTransferTxData, context: TxContext) => {
    const { fromAddress, toAddress, alphAmount, gasAmount, gasPrice } = transactionData
    const amountInSet = convertAlphToSet(alphAmount)
    const sweep = amountInSet === fromAddress.availableBalance
    context.setIsSweeping(sweep)
    if (sweep) {
      const { unsignedTxs, fees } = await client.buildSweepTransactions(fromAddress, toAddress)
      context.setSweepUnsignedTxs(unsignedTxs)
      context.setFees(fees)
    } else {
      console.log(`======= ${fromAddress.hash} -> ${toAddress}`)
      const { data } = await client.clique.transactionCreate(
        fromAddress.hash,
        fromAddress.publicKey,
        toAddress,
        amountInSet.toString(),
        undefined,
        gasAmount ? gasAmount : undefined,
        gasPrice ? convertAlphToSet(gasPrice).toString() : undefined
      )
      context.setUnsignedTransaction(data.unsignedTx)
      context.setUnsignedTxId(data.txId)
      context.setFees(BigInt(data.gasAmount) * BigInt(data.gasPrice))
    }
  }

  const handleSend = async (client: Client, transactionData: BuildTransferTxData, context: TxContext) => {
    const { fromAddress, toAddress, alphAmount, ...rest } = transactionData
    console.log(`======= data: ${alphAmount} ${JSON.stringify(rest)}`)

    if (toAddress) {
      if (context.isSweeping) {
        const sendToAddress = context.consolidationRequired ? fromAddress.hash : toAddress
        const transactionType = context.consolidationRequired ? 'consolidation' : 'sweep'

        for (const { txId, unsignedTx } of context.sweepUnsignedTxs) {
          const data = await client.signAndSendTransaction(
            fromAddress,
            txId,
            unsignedTx,
            sendToAddress,
            transactionType,
            context.currentNetwork
          )

          if (data) {
            context.setAddress(fromAddress)
          }
        }
      } else {
        const data = await client.signAndSendTransaction(
          fromAddress,
          context.unsignedTxId,
          context.unsignedTransaction,
          toAddress,
          'transfer',
          context.currentNetwork,
          convertAlphToSet(alphAmount)
        )
        return data.signature
      }
    }
  }

  const getWalletConnectResult = (context: TxContext, signature: string): SignTransferTxResult => ({
    unsignedTx: context.unsignedTransaction,
    txId: context.unsignedTxId,
    signature: signature
  })

  return (
    <TxModalFactory
      buildTitle="Send"
      initialTxData={initialTxData}
      onClose={onClose}
      BuildTx={BuildTransferTx}
      CheckTx={CheckTransferTx}
      buildTransaction={buildTransaction}
      handleSend={handleSend}
      getWalletConnectResult={getWalletConnectResult}
    />
  )
}

export default TransferTxModal
