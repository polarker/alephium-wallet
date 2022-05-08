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

export interface BuildDeployContractTxData {
  fromAddress: Address
  bytecode: string
  initialFields: node.Val[]

  alphAmount?: string
  issueTokenAmount?: string
  gasAmount?: number
  gasPrice?: string
}

export interface BuildDeployContractTxProps {
  data: PartialTxData<BuildDeployContractTxData, 'fromAddress'>
  onSubmit: (data: BuildDeployContractTxData) => void
  onCancel: () => void
}

const BuildDeployContractTx = ({ data, onSubmit, onCancel }: BuildDeployContractTxProps) => {
  const [fromAddress, FromAddress, alphAmount, AlphAmount, gasAmount, gasPrice, GasSettings, isCommonReady] =
    useBuildTxCommon(data.fromAddress, data.alphAmount, data.gasAmount, data.gasPrice)
  const [bytecode, Bytecode] = useBytecode(data.bytecode ?? '')
  const [fields, Fields] = useContractFields(data.initialFields ?? [])
  const [issueTokenAmount, IssueTokenAmount] = useIssueTokenAmount(data.issueTokenAmount ?? '')

  const isSubmitButtonActive =
    isCommonReady &&
    bytecode &&
    (!alphAmount || isAmountWithinRange(convertAlphToSet(alphAmount), fromAddress.availableBalance))

  return (
    <>
      <ModalContent>
        {FromAddress}
        {Bytecode}
        {Fields}
        {AlphAmount}
        {IssueTokenAmount}
      </ModalContent>
      {GasSettings}
      <SubmitOrCancel
        onSubmit={() =>
          onSubmit({
            fromAddress: data.fromAddress,
            bytecode: bytecode,
            initialFields: fields.fields,
            issueTokenAmount: issueTokenAmount ? issueTokenAmount : undefined,
            alphAmount: alphAmount ? alphAmount : undefined,
            gasAmount: gasAmount.value,
            gasPrice: gasPrice.value ? gasPrice.value : undefined
          })
        }
        onCancel={onCancel}
        isSubmitButtonActive={isSubmitButtonActive}
      />
    </>
  )
}

export default BuildDeployContractTx
