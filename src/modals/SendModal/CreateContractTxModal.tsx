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
import BuildCreateContractTx, { BuildCreateContractTxData, BuildCreateContractTxProps } from './BuildCreateContractTx'
import CheckCreateContractTx from './CheckCreateContractTx'

export type CreateContractTxModalProps = {
  initialTxData: BuildCreateContractTxProps['data']
  onClose: () => void
}

const CreateContractTxModal = ({ initialTxData, onClose }: CreateContractTxModalProps) => {
  const buildTransaction = async (client: Client, transactionData: BuildCreateContractTxData, context: TxContext) => {
    return
  }

  const handleSend = async (client: Client, transactionData: BuildCreateContractTxData, context: TxContext) => {
    return
  }

  return (
    <TxModalFactory
      buildTitle="Deploy Contract"
      initialTxData={initialTxData}
      onClose={onClose}
      BuildTx={BuildCreateContractTx}
      CheckTx={CheckCreateContractTx}
      buildTransaction={buildTransaction}
      handleSend={handleSend}
    />
  )
}

export default CreateContractTxModal
