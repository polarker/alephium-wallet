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

import { convertAlphToSet, node } from '@alephium/sdk'

import { Address } from '../../contexts/addresses'
import { isAmountWithinRange } from '../../utils/transactions'
import {
  ModalContent,
  PartialTxData,
  SubmitOrCancel,
  useBuildTxCommon,
  useBytecode,
  useContractFields,
  useIssueTokenAmount
} from './utils'

export interface BuildCreateContractTxData {
  fromAddress: Address
  bytecode: string
  initialFields: node.Val[]

  alphAmount?: string
  issueTokenAmount?: string
  gasAmount?: string
  gasPrice?: string
}

export interface BuildCreateContractTxProps {
  data: PartialTxData<BuildCreateContractTxData, 'fromAddress'>
  onSubmit: (data: BuildCreateContractTxData) => void
  onCancel: () => void
}

const BuildCreateContractModal = ({ data, onSubmit, onCancel }: BuildCreateContractTxProps) => {
  const [fromAddress, fromAddressFC, alphAmount, alphAmountFC, gasAmount, gasPrice, gasSettingsFC, isCommonReady] =
    useBuildTxCommon(data.fromAddress, data.alphAmount, data.gasAmount, data.gasPrice)
  const [bytecode, bytecodeFC] = useBytecode(data.bytecode ?? '')
  const [fields, fieldsFC] = useContractFields(data.initialFields ?? [])
  const [issueTokenAmount, issueTokenAmountFC] = useIssueTokenAmount(data.issueTokenAmount ?? '0')

  const isSubmitButtonActive =
    isCommonReady &&
    !bytecode &&
    alphAmount &&
    isAmountWithinRange(convertAlphToSet(alphAmount), fromAddress.availableBalance)

  return (
    <>
      <ModalContent>
        {fromAddressFC}
        {alphAmountFC}
        {bytecodeFC}
        {fieldsFC}
        {issueTokenAmountFC}
      </ModalContent>
      {gasSettingsFC}
      <SubmitOrCancel
        onSubmit={() =>
          onSubmit({
            fromAddress: data.fromAddress,
            bytecode: bytecode,
            initialFields: fields.fields,
            issueTokenAmount: issueTokenAmount,
            alphAmount: alphAmount,
            gasAmount: gasAmount.value,
            gasPrice: gasPrice.value
          })
        }
        onCancel={onCancel}
        isSubmitButtonActive={isSubmitButtonActive}
      />
    </>
  )
}

export default BuildCreateContractModal
