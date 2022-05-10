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

import WalletConnectClient, { CLIENT_EVENTS } from '@walletconnect/client'
import { SessionTypes } from '@walletconnect/types'
import { SignContractCreationTxParams, SignScriptTxParams, SignTransferTxParams } from 'alephium-web3'
import { createContext, Dispatch, FC, SetStateAction, useContext, useEffect, useState } from 'react'

import { useAddressesContext } from '../contexts/addresses'
import { BuildDeployContractTxData } from '../modals/SendModal/BuildDeployContractTx'
import { BuildScriptTxData } from '../modals/SendModal/BuildScriptTx'
import { BuildTransferTxData } from '../modals/SendModal/BuildTransferTx'
import { TxModalType, useGlobalContext } from './global'

export interface ContextType {
  isWalletConnectModalOpen: boolean
  setIsWalletConnectModalOpen: (isOpen: boolean) => void
  walletConnect?: WalletConnectClient
  setWalletConnect: Dispatch<SetStateAction<WalletConnectClient | undefined>>
  dappTransactionData?:
    | ['transfer', BuildTransferTxData]
    | ['deploy-contract', BuildDeployContractTxData]
    | ['script', BuildScriptTxData]
    | undefined
  requestEvent?: SessionTypes.RequestEvent
}

export const initialContext: ContextType = {
  isWalletConnectModalOpen: false,
  setIsWalletConnectModalOpen: () => undefined,
  walletConnect: undefined,
  setWalletConnect: () => undefined,
  dappTransactionData: undefined,
  requestEvent: undefined
}

export const Context = createContext<ContextType>(initialContext)

export const WalletConnectContextProvider: FC = ({ children }) => {
  const { setTxModalType, settings } = useGlobalContext()
  const { addresses } = useAddressesContext()
  const [isWalletConnectModalOpen, setIsWalletConnectModalOpen] = useState(false)
  const [walletConnect, setWalletConnect] = useState<WalletConnectClient>()
  const [dappTransactionData, setDappTransactionData] = useState<ContextType['dappTransactionData']>()
  const [requestEvent, setRequestEvent] = useState<SessionTypes.RequestEvent>()

  const setTxData = (type: TxModalType, data: typeof dappTransactionData[1]) => {
    setDappTransactionData([type, data])
    setTxModalType(type)
  }

  useEffect(() => {
    if (walletConnect === undefined) {
      WalletConnectClient.init({
        controller: true,

        // TODO: add as an advanced settings option "WalletConnect Project Id"
        projectId: '6e2562e43678dd68a9070a62b6d52207',
        relayUrl: 'wss://relay.walletconnect.com',
        metadata: {
          name: 'Alephium Wallet',
          description: 'Alephium Wallet',
          url: 'https://github.com/alephium/desktop-wallet/releases',
          icons: ['https://alephium.org/favicon-32x32.png']
        }
      })
        .then((client) => {
          setWalletConnect(client)
        })
        .catch((e) => {
          console.log('WalletConnect error')
          console.log(e)
        })
      return
    }

    const extractAddress = (signerAddress: string) => {
      const address = addresses.find((a) => a.hash === signerAddress)
      if (typeof address === 'undefined') {
        throw new Error(`Unknown signer address: ${signerAddress}`)
      }
      return address
    }

    const onSessionRequest = async (event: SessionTypes.RequestEvent) => {
      const {
        topic,
        request: { method, params }
      } = event
      setRequestEvent(event)

      try {
        console.log(`============= ${method} ${JSON.stringify(params)}`)
        if (method === 'alph_signTransferTx') {
          const p = params as SignTransferTxParams
          const txData: BuildTransferTxData = {
            fromAddress: extractAddress(p.signerAddress),
            toAddress: p.destinations[0].address,
            alphAmount: p.destinations[0].alphAmount,
            gasAmount: p.gasAmount,
            gasPrice: p.gasPrice
          }
          setTxData('transfer', txData)
        } else if (method === 'alph_signContractCreationTx') {
          const p = params as SignContractCreationTxParams
          const txData: BuildDeployContractTxData = {
            fromAddress: extractAddress(p.signerAddress),
            bytecode: p.bytecode,
            initialFields: p.initialFields,
            alphAmount: p.alphAmount,
            issueTokenAmount: p.issueTokenAmount,
            gasAmount: p.gasAmount,
            gasPrice: p.gasPrice
          }
          console.log(
            `========== txData : ${JSON.stringify(dappTransactionData, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            )}`
          )
          setTxData('deploy-contract', txData)
        } else if (method === 'alph_signScriptTx') {
          const p = params as SignScriptTxParams
          const txData: BuildScriptTxData = {
            fromAddress: extractAddress(p.signerAddress),
            bytecode: p.bytecode,
            alphAmount: p.alphAmount,
            gasAmount: p.gasAmount,
            gasPrice: p.gasPrice
          }
          setTxData('script', txData)
        } else {
          throw new Error(`Unsupported walletconnect request: ${method}`)
        }
      } catch (e) {
        console.warn(e)
        let error: string
        if (typeof e === 'string') {
          error = e
        } else if (e instanceof Error) {
          error = e.message
        } else {
          error = 'Unknown internal error'
        }
        walletConnect.disconnect({
          topic: topic,
          reason: {
            code: -32000,
            message: error
          }
        })
      }
    }

    walletConnect.on(CLIENT_EVENTS.session.request, onSessionRequest)
    return () => {
      walletConnect.removeListener(CLIENT_EVENTS.session.request, onSessionRequest)
    }
  }, [walletConnect, addresses, setTxModalType, settings])

  return (
    <Context.Provider
      value={{
        requestEvent,
        isWalletConnectModalOpen,
        setIsWalletConnectModalOpen,
        walletConnect,
        setWalletConnect,
        dappTransactionData
      }}
    >
      {children}
    </Context.Provider>
  )
}

export const useWalletConnectContext = () => useContext(Context)
