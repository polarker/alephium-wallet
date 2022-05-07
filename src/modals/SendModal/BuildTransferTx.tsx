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
import AddressSelect from '../../components/Inputs/AddressSelect'

import { Address } from '../../contexts/addresses'
import { isAmountWithinRange } from '../../utils/transactions'
import {
  FromAddressSelect,
  ModalContent,
  PartialTxData,
  SubmitOrCancel,
  ToAddress,
  useAddress,
  useBuildTxCommon
} from './utils'

export interface BuildTransferTxData {
  fromAddress: Address
  toAddress: string
  alphAmount: string
  gasAmount?: string
  gasPrice?: string
}

export interface BuildTransferTxProps {
  data: PartialTxData<BuildTransferTxData, 'fromAddress'>
  onSubmit: (data: BuildTransferTxData) => void
  onCancel: () => void
}

const BuildTransferTx = ({ data, onSubmit, onCancel }: BuildTransferTxProps) => {
  const [fromAddress, setFromAddress, alphAmount, AlphAmount, gasAmount, gasPrice, GasSettings, isCommonReady] =
    useBuildTxCommon(data.fromAddress, data.alphAmount, data.gasAmount, data.gasPrice)
  const [toAddress, handleAddressChange] = useAddress(data?.toAddress ?? '')

  const isSubmitButtonActive =
    isCommonReady &&
    toAddress.value &&
    !toAddress.error &&
    alphAmount &&
    isAmountWithinRange(convertAlphToSet(alphAmount), fromAddress.availableBalance)

  return (
    <>
      <ModalContent>
        <FromAddressSelect defaultAddress={fromAddress} setFromAddress={setFromAddress} />
        <ToAddress toAddress={toAddress} handleAddressChange={handleAddressChange} />
        {AlphAmount}
      </ModalContent>
      {GasSettings}
      <SubmitOrCancel
        onSubmit={() =>
          onSubmit({
            fromAddress: fromAddress,
            toAddress: toAddress.value,
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

export default BuildTransferTx
