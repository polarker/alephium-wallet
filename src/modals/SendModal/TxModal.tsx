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
import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import ExpandableSection from '../../components/ExpandableSection'
import PasswordConfirmation from '../../components/PasswordConfirmation'
import { Address, useAddressesContext } from '../../contexts/addresses'
import { Client, TxModalType, useGlobalContext } from '../../contexts/global'
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
import TransferTxModal from './TransferTxModal'
import CreateContractTxModal from './CreateContractTxModal'
import ScriptTxModal from './ScriptTxModal'
import { NetworkType } from '../../utils/settings'

type ReactSet<T> = Dispatch<SetStateAction<T>>

export type TxContext = {
  setIsSweeping: ReactSet<boolean>
  sweepUnsignedTxs: SweepAddressTransaction[]
  setSweepUnsignedTxs: ReactSet<SweepAddressTransaction[]>
  setFees: ReactSet<bigint | undefined>
  unsignedTransaction: string
  setUnsignedTransaction: ReactSet<string>
  unsignedTxId: string
  setUnsignedTxId: ReactSet<string>
  isSweeping: boolean
  consolidationRequired: boolean
  currentNetwork: NetworkType
  setAddress: (address: Address) => void
}

export type TxModalProps = {
  initialAddress: Address | undefined
  txModalType: TxModalType
  onClose: () => void
}

export type TxModalFactoryProps<PT extends { fromAddress: Address }, T extends PT> = {
  initialTxData: PT
  onClose: () => void
  BuildTx: (props: { data: PT; onSubmit: (data: T) => void; onCancel: () => void }) => JSX.Element
  CheckTx: (props: { data: T; fees: bigint; onSend: () => void; onCancel: () => void }) => JSX.Element
  buildTransaction: (client: Client, data: T, context: TxContext) => void
  handleSend: (client: Client, data: T, context: TxContext) => void
}

export function TxModalFactory<PT extends { fromAddress: Address }, T extends PT>({
  initialTxData,
  onClose,
  BuildTx,
  CheckTx,
  buildTransaction,
  handleSend
}: TxModalFactoryProps<PT, T>) {
  const {
    currentNetwork,
    client,
    wallet,
    settings: {
      general: { passwordRequirement }
    },
    setSnackbarMessage
  } = useGlobalContext()
  const [title, setTitle] = useState('')
  const [transactionData, setTransactionData] = useState<T | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<Step>('send')
  const [isConsolidateUTXOsModalVisible, setIsConsolidateUTXOsModalVisible] = useState(false)
  const [consolidationRequired, setConsolidationRequired] = useState(false)
  const [isSweeping, setIsSweeping] = useState(false)
  const [sweepUnsignedTxs, setSweepUnsignedTxs] = useState<SweepAddressTransaction[]>([])
  const [fees, setFees] = useState<bigint>()
  const theme = useTheme()

  const { setAddress } = useAddressesContext()
  const [unsignedTxId, setUnsignedTxId] = useState('')
  const [unsignedTransaction, setUnsignedTransaction] = useState('')

  const getTxContext = (): TxContext => ({
    setIsSweeping: setIsSweeping,
    sweepUnsignedTxs: sweepUnsignedTxs,
    setSweepUnsignedTxs: setSweepUnsignedTxs,
    setFees: setFees,
    unsignedTransaction: unsignedTransaction,
    setUnsignedTransaction: setUnsignedTransaction,
    unsignedTxId: unsignedTxId,
    setUnsignedTxId: setUnsignedTxId,
    isSweeping: isSweeping,
    consolidationRequired: consolidationRequired,
    currentNetwork: currentNetwork,
    setAddress: setAddress
  })

  useEffect(() => {
    setTitle(stepToTitle[step])
  }, [setStep, setTitle, step])

  const confirmPassword = () => {
    if (consolidationRequired) setIsConsolidateUTXOsModalVisible(false)
    setStep('password-check')
  }

  useEffect(() => {
    if (!consolidationRequired || !transactionData || !client) return

    const buildConsolidationTransactions = async () => {
      setIsSweeping(true)

      setIsLoading(true)
      const { fromAddress } = transactionData
      const { unsignedTxs, fees } = await client.buildSweepTransactions(fromAddress, fromAddress.hash)
      setSweepUnsignedTxs(unsignedTxs)
      setFees(fees)
      setIsLoading(false)
    }

    buildConsolidationTransactions()
  }, [client, consolidationRequired, transactionData])

  const modalHeader = theme.name === 'dark' ? <PaperPlaneDarkSVG width="315px" /> : <PaperPlaneLightSVG width="315px" />
  const buildTransactionExtended = (data: T) => {
    setTransactionData(data)
    if (wallet && client) {
      setIsLoading(true)
      try {
        buildTransaction(client, data, getTxContext())
        if (!isConsolidateUTXOsModalVisible) {
          setStep('info-check')
        }
      } catch (e) {
        // TODO: When API error codes are available, replace this substring check with a proper error code check
        const { error } = e as APIError
        if (error?.detail && (error.detail.includes('consolidating') || error.detail.includes('consolidate'))) {
          setIsConsolidateUTXOsModalVisible(true)
          setConsolidationRequired(true)
        } else {
          setSnackbarMessage({
            text: getHumanReadableError(e, 'Error while building the transaction'),
            type: 'alert',
            duration: 5000
          })
        }
      }
      setIsLoading(false)
    }
  }

  const handleSendExtended = () => {
    if (client && transactionData) {
      setIsLoading(true)
      try {
        handleSend(client, transactionData, getTxContext())
        setSnackbarMessage({
          text: isSweeping && sweepUnsignedTxs.length > 1 ? 'Transactions sent!' : 'Transaction sent!',
          type: 'success'
        })
        onClose()
      } catch (e) {
        console.error(e)
        setSnackbarMessage({
          text: getHumanReadableError(e, 'Error while sending the transaction'),
          type: 'alert',
          duration: 5000
        })
      }
      setIsLoading(false)
    }
  }
  return (
    <CenteredModal title={title} onClose={onClose} isLoading={isLoading} header={modalHeader}>
      {step === 'send' && (
        <BuildTx data={transactionData ?? initialTxData} onSubmit={buildTransactionExtended} onCancel={onClose} />
      )}
      {step === 'info-check' && transactionData && fees && (
        <CheckTx
          data={transactionData}
          fees={fees}
          onSend={passwordRequirement ? confirmPassword : handleSendExtended}
          onCancel={() => setStep('send')}
        />
      )}
      {step === 'password-check' && passwordRequirement && (
        <PasswordConfirmation
          text="Enter your password to send the transaction."
          buttonText="Send"
          onCorrectPasswordEntered={handleSendExtended}
        />
      )}
      <AnimatePresence>
        {isConsolidateUTXOsModalVisible && (
          <ConsolidateUTXOsModal
            onClose={() => setIsConsolidateUTXOsModalVisible(false)}
            onConsolidateClick={passwordRequirement ? confirmPassword : handleSendExtended}
            fee={fees}
          />
        )}
      </AnimatePresence>
    </CenteredModal>
  )
}

export const TxModal = ({ initialAddress, txModalType, onClose }: TxModalProps) => {
  if (typeof initialAddress === 'undefined') {
    return <></>
  }

  console.log('========== refresh TxModal')

  const txData = { fromAddress: initialAddress }
  return (
    <>
      {txModalType === 'transfer' && <TransferTxModal initialTxData={txData} onClose={onClose} />}
      {txModalType === 'create-contract' && <CreateContractTxModal initialTxData={txData} onClose={onClose} />}
      {txModalType === 'script' && <ScriptTxModal initialTxData={txData} onClose={onClose} />}
    </>
  )
}

export const MemoizedTxModal = React.memo(TxModal, (_) => true)
