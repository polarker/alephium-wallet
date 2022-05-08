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

import { getStorage } from '@alephium/sdk'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { AnimatePresence, motion } from 'framer-motion'
import { FileCode, Layers, List, Lock, RefreshCw, Send, TerminalSquare } from 'lucide-react'
import React, { FC, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import ActionButton from '../../components/ActionButton'
import AppHeader from '../../components/AppHeader'
import Button from '../../components/Button'
import InfoBox from '../../components/InfoBox'
import Select from '../../components/Inputs/Select'
import PasswordConfirmation from '../../components/PasswordConfirmation'
import Spinner from '../../components/Spinner'
import { useAddressesContext } from '../../contexts/addresses'
import { useGlobalContext } from '../../contexts/global'
import LogoDarkSrc from '../../images/alephium_logo_dark.svg'
import LogoLightSrc from '../../images/alephium_logo_light.svg'
import CenteredModal from '../../modals/CenteredModal'
import { TxModal } from '../../modals/SendModal/TxModal'
import { appHeaderHeightPx, deviceBreakPoints, walletSidebarWidthPx } from '../../style/globalStyles'

interface AccountNameSelectOptions {
  label: string
  value: string
}

dayjs.extend(relativeTime)

const Storage = getStorage()

const WalletLayout: FC = ({ children }) => {
  const { wallet, lockWallet, currentAccountName, login, isOffline, txModalType, setTxModalType } = useGlobalContext()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const { refreshAddressesData, isLoadingData, mainAddress } = useAddressesContext()
  const history = useHistory()
  const location = useLocation()
  const theme = useTheme()
  const accountNames = Storage.list()
  const [switchToAccountName, setSwitchToAccountName] = useState(currentAccountName)
  const accountNameSelectOptions = accountNames
    .filter((accountName) => accountName !== currentAccountName)
    .map((accountName) => ({
      label: accountName,
      value: accountName
    }))

  const refreshData = () => {
    refreshAddressesData()
  }

  const handleAccountNameChange = (option: AccountNameSelectOptions | undefined) => {
    if (option && option.value !== switchToAccountName && option.value !== currentAccountName) {
      setSwitchToAccountName(option.value)
      setIsPasswordModalOpen(true)
    }
  }

  const onLoginClick = (password: string) => {
    setIsPasswordModalOpen(false)
    login(switchToAccountName, password, () => {
      const nextPageLocation = '/wallet/overview'
      if (location.pathname !== nextPageLocation) history.push(nextPageLocation)
    })
  }

  if (!wallet) return null

  return (
    <WalletContainer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
      <AppHeader>
        {!isOffline && (
          <RefreshButton
            transparent
            squared
            onClick={refreshData}
            disabled={isLoadingData}
            aria-label="Refresh"
            data-tip="Refresh data"
          >
            {isLoadingData ? <Spinner /> : <RefreshCw />}
          </RefreshButton>
        )}
      </AppHeader>
      <WalletSidebar>
        <LogoContainer>
          <Logo src={theme.name === 'light' ? LogoDarkSrc : LogoLightSrc} alt="Alephium Logo" />
          <Texts>
            <AlephiumText>Alephium</AlephiumText>
            <WalletText>Wallet</WalletText>
          </Texts>
        </LogoContainer>
        {accountNameSelectOptions.length === 0 ? (
          <InfoBox text={currentAccountName} label="WALLET" />
        ) : (
          <Select
            placeholder="WALLET"
            options={accountNameSelectOptions}
            controlledValue={{
              label: currentAccountName,
              value: currentAccountName
            }}
            onValueChange={handleAccountNameChange}
            title="Select a wallet"
            id="account"
            raised
          />
        )}
        <WalletActions>
          <ActionsTitle>MENU</ActionsTitle>
          <ActionButton Icon={Layers} label="Overview" link="/wallet/overview" />
          <ActionButton Icon={List} label="Addresses" link="/wallet/addresses" />
          <ActionButton Icon={Send} label="Send" onClick={() => setTxModalType('transfer')} />
          <ActionButton Icon={TerminalSquare} label="Call Contract" onClick={() => setTxModalType('script')} />
          <ActionButton Icon={FileCode} label="Deploy Contract" onClick={() => setTxModalType('deploy-contract')} />
          <ActionButton Icon={Lock} label="Lock" onClick={lockWallet} />
        </WalletActions>
      </WalletSidebar>
      <AnimatePresence exitBeforeEnter initial={true}>
        {txModalType && <TxModal txModalType={txModalType} onClose={() => setTxModalType(false)} />}
        {isPasswordModalOpen && (
          <CenteredModal title="Enter password" onClose={() => setIsPasswordModalOpen(false)}>
            <PasswordConfirmation
              text={`Enter password for "${switchToAccountName}"`}
              buttonText="Login"
              onCorrectPasswordEntered={onLoginClick}
              accountName={switchToAccountName}
            />
          </CenteredModal>
        )}
      </AnimatePresence>
      {children}
    </WalletContainer>
  )
}

const WalletContainer = styled(motion.div)`
  display: flex;
  flex: 1;

  @media ${deviceBreakPoints.mobile} {
    flex-direction: column;
    overflow: initial;
  }
`

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 50px;
  margin-left: var(--spacing-2);
`

const Logo = styled.img`
  width: 30px;
`

const Texts = styled.div``

const AlephiumText = styled.div`
  font-weight: var(--fontWeight-semiBold);
  font-size: 20px;
  margin-bottom: 3px;
`

const WalletText = styled.div`
  font-weight: var(--fontWeight-semiBold);
  font-size: 16px;
  color: ${({ theme }) => theme.font.secondary};
`

const WalletSidebar = styled.div`
  position: fixed;
  top: 0;
  bottom: 0;
  align-items: stretch;
  justify-content: flex-start;
  flex: 1;
  width: ${walletSidebarWidthPx}px;
  border-right: 1px solid ${({ theme }) => theme.border.secondary};
  background-color: ${({ theme }) => theme.bg.tertiary};
  padding: ${appHeaderHeightPx}px var(--spacing-4) 0;
  z-index: 1000;

  @media ${deviceBreakPoints.mobile} {
    position: relative;
    flex: 0;
    max-width: inherit;
    border: none;
    z-index: 0;
  }
`

const WalletActions = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-top: 35px;

  @media ${deviceBreakPoints.mobile} {
    border-bottom: 1px solid ${({ theme }) => theme.border.secondary};
  }
`

const ActionsTitle = styled.h3`
  width: 100%;
  color: ${({ theme }) => theme.font.secondary};
  margin-top: 0;
`

const RefreshButton = styled(Button)``

export default WalletLayout
