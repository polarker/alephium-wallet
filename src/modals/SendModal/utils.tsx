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

import { node, Val, toApiVal } from 'alephium-web3'
import { APIError, convertAlphToSet, getHumanReadableError, formatAmountForDisplay } from '@alephium/sdk'
import { SweepAddressTransaction } from '@alephium/sdk/api/alephium'
import { AnimatePresence } from 'framer-motion'
import { memo, ReactNode, useEffect, useMemo, useState } from 'react'
import styled, { DefaultTheme, useTheme } from 'styled-components'

import AlefSymbol from '../../components/AlefSymbol'
import AmountInput from '../../components/Inputs/AmountInput'
import PasswordConfirmation from '../../components/PasswordConfirmation'
import ExpandableSection from '../../components/ExpandableSection'
import AddressSelect from '../../components/Inputs/AddressSelect'
import InfoBox from '../../components/InfoBox'
import Input from '../../components/Inputs/Input'
import { Address, useAddressesContext } from '../../contexts/addresses'
import { MINIMAL_GAS_AMOUNT, MINIMAL_GAS_PRICE } from '../../utils/constants'
import { ReactComponent as PaperPlaneDarkSVG } from '../../images/paper-plane-dark.svg'
import { ReactComponent as PaperPlaneLightSVG } from '../../images/paper-plane-light.svg'
import { TX_SMALLEST_ALPH_AMOUNT_STR } from '../../utils/constants'
import { isAmountWithinRange } from '../../utils/transactions'
import CenteredModal from '../CenteredModal'
import ConsolidateUTXOsModal from '../ConsolidateUTXOsModal'
import SendModalCheckTransaction from './CheckTransaction'
import SendModalTransactionForm from './TransactionForm'
import { ModalFooterButton, ModalFooterButtons } from '../CenteredModal'
import { checkAddressValidity } from '../../utils/addresses'

export type Step = 'send' | 'info-check' | 'password-check'

export type PartialTxData<T, K extends keyof T> = {
  [P in keyof Omit<T, K>]?: T[P]
} & Pick<T, K>

export const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
`

export const ExpandableSectionStyled = styled(ExpandableSection)`
  margin-top: 38px;
`

export const InfoBoxStyled = styled(InfoBox)`
  margin-top: var(--spacing-5);
`

export const checkAmount = (amount: string, minAmount: bigint, shouldConvertToSet: boolean): string | undefined => {
  try {
    const amountNumber = shouldConvertToSet ? convertAlphToSet(amount || '0') : BigInt(amount)
    if (amountNumber < minAmount) {
      return `The amount must be greater than ${formatAmountForDisplay(minAmount)}`
    }
  } catch (e) {
    return 'Unable to convert the amount'
  }
}

export const minimalGasPriceInALPH = formatAmountForDisplay(MINIMAL_GAS_PRICE, true)

export type WithError<T> = { value: T; error: string }

export function useStateWithError<T>(initialValue: T) {
  const [value, setValue] = useState({ value: initialValue, error: '' })

  const setValueWithError = (newValue: T, newError: string) => {
    setValue({ value: newValue, error: newError })
  }

  return [value, setValueWithError] as const
}

export function useAddress(initialAddress: string) {
  const [address, setAddress] = useStateWithError(initialAddress)

  const handleAddressChange = (value: string) => {
    if (checkAddressValidity(value)) {
      setAddress(value, '')
    } else {
      setAddress(value, 'Address format is incorrect')
    }
  }

  return [address, handleAddressChange] as const
}

export function useFromAddress(initialAddress: Address) {
  const [fromAddress, setFromAddress] = useState(initialAddress)

  const _FromAddress = <FromAddressSelect defaultAddress={fromAddress} setFromAddress={setFromAddress} />
  const [FromAddress] = useState(_FromAddress)

  return [fromAddress, FromAddress] as const
}

export function useBytecode(initialBytecode: string) {
  const [bytecode, setBytecode] = useState(initialBytecode)
  const Bytecode = () => (
    <Input id="code" placeholder="bytecode" value={bytecode} onChange={(e) => setBytecode(e.target.value)} />
  )

  return [bytecode, Bytecode] as const
}

export function useBuildTxCommon(
  initialFromAddress: Address,
  initialAlphAmount: string | undefined,
  initialGasAmount: string | undefined,
  initialGasPrice: string | undefined
) {
  const theme = useTheme()
  const [fromAddress, FromAddress] = useFromAddress(initialFromAddress)
  const [alphAmount, setAlphAmount] = useState(initialAlphAmount ?? '')
  const [gasAmount, setGasAmount] = useStateWithError(initialGasAmount ?? '')
  const [gasPrice, setGasPrice] = useStateWithError(initialGasPrice ?? minimalGasPriceInALPH)

  console.log('======== useBuildTx')

  const handleGasAmountChange = (newGasAmount: string) => {
    const error = checkAmount(newGasAmount, BigInt(MINIMAL_GAS_AMOUNT), false)
    if (typeof error !== 'undefined') {
      setGasAmount(newGasAmount, error)
    } else {
      setGasAmount(newGasAmount, '')
    }
  }

  const handleGasPriceChange = (newGasPrice: string) => {
    const error = checkAmount(newGasPrice, MINIMAL_GAS_PRICE, true)
    if (typeof error !== 'undefined') {
      setGasPrice(newGasPrice, error)
    } else {
      setGasPrice(newGasPrice, '')
    }
  }

  const expectedFeeInALPH =
    gasAmount && gasPrice && formatAmountForDisplay(BigInt(gasAmount.value) * convertAlphToSet(gasPrice.value), true)

  const isCommonReady = !gasAmount.error && !gasPrice.error

  const _AlphAmount = () => (
    <TxAmount
      alphAmount={alphAmount}
      setAlphAmount={setAlphAmount}
      availableBalance={fromAddress.availableBalance}
      expectedFeeInALPH={expectedFeeInALPH}
    />
  )
  const [AlphAmount] = useState(() => _AlphAmount)

  const _GasSettings = () => (
    <ExpandableSectionStyled sectionTitleClosed="Gas">
      <GasAmount gasAmount={gasAmount} handleGasAmountChange={handleGasAmountChange} />
      <GasPrice theme={theme} gasPrice={gasPrice} handleGasPriceChange={handleGasPriceChange} />
    </ExpandableSectionStyled>
  )
  const [GasSettings] = useState(() => _GasSettings)

  return [fromAddress, FromAddress, alphAmount, AlphAmount, gasAmount, gasPrice, GasSettings, isCommonReady] as const
}

export const FromAddressSelect = ({
  defaultAddress,
  setFromAddress
}: {
  defaultAddress: Address
  setFromAddress: (newAddress: Address) => void
}) => {
  const { addresses } = useAddressesContext()

  return (
    <AddressSelect
      placeholder="From address"
      title="Select the address to send funds from."
      options={addresses}
      defaultAddress={defaultAddress}
      onAddressChange={(newAddress) => setFromAddress(newAddress)}
      id="from-address"
      hideEmptyAvailableBalance
    />
  )
}

export const ToAddress = ({
  toAddress,
  handleAddressChange
}: {
  toAddress: WithError<string>
  handleAddressChange: (address: string) => void
}) => {
  return (
    <Input
      placeholder="Recipient's address"
      value={toAddress.value}
      onChange={(e) => handleAddressChange(e.target.value)}
      error={toAddress.error}
      isValid={toAddress.value.length > 0 && !toAddress.error}
    />
  )
}

export const TxAmount = ({
  alphAmount,
  setAlphAmount,
  availableBalance,
  expectedFeeInALPH
}: {
  alphAmount: string
  setAlphAmount: (amount: string) => void
  availableBalance: bigint
  expectedFeeInALPH: string
}) => {
  return (
    <>
      <AmountInput value={alphAmount} onChange={setAlphAmount} availableAmount={availableBalance} />
      {expectedFeeInALPH && (
        <InfoBoxStyled short label="Expected fee">
          {expectedFeeInALPH}
          <AlefSymbol />
        </InfoBoxStyled>
      )}
    </>
  )
}

export const GasAmount = ({
  gasAmount,
  handleGasAmountChange
}: {
  gasAmount: WithError<string>
  handleGasAmountChange: (error: string) => void
}) => {
  return (
    <Input
      id="gas-amount"
      placeholder="Gas amount"
      value={gasAmount.value}
      onChange={(e) => handleGasAmountChange(e.target.value)}
      type="number"
      min={MINIMAL_GAS_AMOUNT}
      error={gasAmount.error}
    />
  )
}

export const GasPrice = ({
  theme,
  gasPrice,
  handleGasPriceChange
}: {
  theme: DefaultTheme
  gasPrice: WithError<string>
  handleGasPriceChange: (error: string) => void
}) => {
  return (
    <Input
      id="gas-price"
      placeholder={
        <>
          Gas price (<AlefSymbol color={theme.font.secondary} />)
        </>
      }
      value={gasPrice.value}
      type="number"
      min={minimalGasPriceInALPH}
      onChange={(e) => handleGasPriceChange(e.target.value)}
      step={minimalGasPriceInALPH}
      error={gasPrice.error}
    />
  )
}

export const SubmitOrCancel = ({
  onSubmit,
  onCancel,
  isSubmitButtonActive
}: {
  onSubmit: () => void
  onCancel: () => void
  isSubmitButtonActive: boolean | string
}) => {
  return (
    <ModalFooterButtons>
      <ModalFooterButton secondary onClick={onCancel}>
        Cancel
      </ModalFooterButton>
      <ModalFooterButton onClick={onSubmit} disabled={!isSubmitButtonActive}>
        Check
      </ModalFooterButton>
    </ModalFooterButtons>
  )
}

const parseField = (field: string): node.Val => {
  const [value, type] = field.split(':').map((t) => t.trim())
  return toApiVal(value, type)
}

const parseFields = (fields: string): node.Val[] => {
  return fields.split(',').map(parseField)
}

const encodeFields = (fields: node.Val[]): string => {
  return fields.map((field) => `${field.value}:${field.type}`).join(',')
}

export function useContractFields(initialFields: node.Val[]) {
  const [fields, setFields] = useState({
    fields: initialFields,
    fieldsString: encodeFields(initialFields),
    error: ''
  })

  const handleFieldsChange = (newFields: string) => {
    try {
      setFields({ fields: parseFields(newFields), fieldsString: newFields, error: '' })
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? `: ${e.message}` : ''
      setFields({ fields: [], fieldsString: newFields, error: `Invalid fields${errorMessage}` })
    }
  }

  const Fields = () => (
    <Input
      id="fields"
      placeholder="Contract fields"
      value={fields.fieldsString}
      onChange={(e) => handleFieldsChange(e.target.value)}
    />
  )

  return [fields, Fields] as const
}

export const InitialFields = ({
  initialFields,
  setInitialFields
}: {
  initialFields: node.Val[]
  setInitialFields: (fields: string) => void
}) => {
  return (
    <Input
      id="fields"
      placeholder="Initial fields"
      value={initialFields.map((field) => `${field.value} ${field.type}`).join(',')}
      onChange={(e) => setInitialFields(e.target.value)}
    />
  )
}

export function useIssueTokenAmount(initialTokenAmount: string | undefined) {
  const [issueTokenAmount, setIssueTokenAmount] = useState(initialTokenAmount ?? '0')
  const IssueTokenAmount = () => (
    <Input
      id="issue-token-amount"
      placeholder="Tokens to issue"
      value={issueTokenAmount}
      type="number"
      onChange={(e) => setIssueTokenAmount(e.target.value)}
    />
  )

  return [issueTokenAmount, IssueTokenAmount] as const
}

export const expectedAmount = (data: { fromAddress: Address; alphAmount?: string }, fees: bigint) => {
  const amountInSet = data.alphAmount ? convertAlphToSet(data.alphAmount) : 0n
  const amountIncludingFees = amountInSet + fees
  const exceededBy = amountIncludingFees - data.fromAddress.availableBalance
  const expectedAmount = exceededBy > 0 ? data.fromAddress.availableBalance - exceededBy : amountInSet
  return expectedAmount
}

export type CheckTxProps<T> = {
  data: T
  fees: bigint
  onSend: () => void
  onCancel: () => void
}

export const FromAddressInfo = ({ fromAddress }: { fromAddress: Address }) => (
  <InfoBox text={fromAddress.hash} label="From address" wordBreak />
)

export const ToAddressInfo = ({ toAddress }: { toAddress: string }) => (
  <InfoBox text={toAddress} label="To address" wordBreak />
)

export const AlphAmountInfo = ({ expectedAmount }: { expectedAmount: bigint }) => (
  <InfoBox label="Amount">
    {formatAmountForDisplay(expectedAmount, false, 7)} <AlefSymbol />
  </InfoBox>
)

export const FeeInfo = ({ fees }: { fees: bigint }) => (
  <InfoBox label="Expected fee">
    {formatAmountForDisplay(fees, true)} <AlefSymbol />
  </InfoBox>
)

export const BytecodeInfo = ({ bytecode }: { bytecode: string }) => (
  <InfoBox text={bytecode} label="Bytecode" wordBreak />
)

export const FieldsInfo = ({ fields }: { fields: node.Val[] }) =>
  fields.length > 0 ? <InfoBox text={encodeFields(fields)} label="Contract Fields" wordBreak /> : <></>

export const IssueTokenAmountInfo = ({ issueTokenAmount }: { issueTokenAmount?: string }) =>
  issueTokenAmount ? <InfoBox text={issueTokenAmount} label="Issue token amount" wordBreak /> : <></>

export const CheckTxFooter = ({ onSend, onCancel }: { onSend: () => void; onCancel: () => void }) => (
  <ModalFooterButtons>
    <ModalFooterButton secondary onClick={onCancel}>
      Cancel
    </ModalFooterButton>
    <ModalFooterButton onClick={onSend}>Send</ModalFooterButton>
  </ModalFooterButtons>
)
