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

import { APIError, convertAlphToSet, formatAmountForDisplay, getHumanReadableError } from '@alephium/sdk'
import { SweepAddressTransaction } from '@alephium/sdk/api/alephium'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import ExpandableSection from '../../components/ExpandableSection'
import PasswordConfirmation from '../../components/PasswordConfirmation'
import { Address, useAddressesContext } from '../../contexts/addresses'
import { Client, useGlobalContext } from '../../contexts/global'
import { useWalletConnectContext } from '../../contexts/walletconnect'
import { ReactComponent as PaperPlaneDarkSVG } from '../../images/paper-plane-dark.svg'
import { ReactComponent as PaperPlaneLightSVG } from '../../images/paper-plane-light.svg'
import { MINIMAL_GAS_AMOUNT, MINIMAL_GAS_PRICE } from '../../utils/constants'
import { TX_SMALLEST_ALPH_AMOUNT_STR } from '../../utils/constants'
import { isAmountWithinRange } from '../../utils/transactions'
import CenteredModal from '../CenteredModal'
import ConsolidateUTXOsModal from '../ConsolidateUTXOsModal'
import { Step, stepToTitle } from '.'
import BuildTransferTx, { BuildTransferTxData, BuildTransferTxProps } from './BuildTransferTx'
import SendModalCheckTransaction from './CheckTransaction'
import CheckTransferTx from './CheckTransferTx'
import SendModalTransactionForm from './TransactionForm'
import BuildScriptTxModal from './BuildScriptTx'
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
      const { data } = await client.clique.transactionCreate(
        fromAddress.hash,
        fromAddress.publicKey,
        toAddress,
        amountInSet.toString(),
        undefined,
        gasAmount ? parseInt(gasAmount) : undefined,
        gasPrice ? convertAlphToSet(gasPrice).toString() : undefined
      )
      context.setUnsignedTransaction(data.unsignedTx)
      context.setUnsignedTxId(data.txId)
      context.setFees(BigInt(data.gasAmount) * BigInt(data.gasPrice))
    }
  }

  const handleSend = async (client: Client, transactionData: BuildTransferTxData, context: TxContext) => {
    const { fromAddress, toAddress, alphAmount } = transactionData

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

        if (data) {
          context.setAddress(fromAddress)
        }
      }
    }
  }

  return (
    <TxModalFactory
      initialTxData={initialTxData}
      onClose={onClose}
      BuildTx={BuildTransferTx}
      CheckTx={CheckTransferTx}
      buildTransaction={buildTransaction}
      handleSend={handleSend}
    />
  )
}

export default TransferTxModal
