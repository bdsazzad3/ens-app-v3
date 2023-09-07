import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { useAccount, useQueryClient } from 'wagmi'

import { Button, Helper, Tag, Typography, mq } from '@ensdomains/thorin'

import AeroplaneSVG from '@app/assets/Aeroplane.svg'
import { BaseLinkWithHistory } from '@app/components/@atoms/BaseLink'
import { cacheableComponentStyles } from '@app/components/@atoms/CacheableComponent'
import { DisabledButtonWithTooltip } from '@app/components/@molecules/DisabledButtonWithTooltip'
import { AvatarWithZorb } from '@app/components/AvatarWithZorb'
import { useDnsImportData } from '@app/hooks/ensjs/dns/useDnsImportData'
import { usePrimaryName } from '@app/hooks/ensjs/public/usePrimaryName'
import { useOwners } from '@app/hooks/useOwners'
import { useTransactionFlow } from '@app/transaction-flow/TransactionFlowProvider'
import { makeIntroItem } from '@app/transaction-flow/intro'
import { makeTransactionItem } from '@app/transaction-flow/transaction'
import { OwnerItem } from '@app/types'
import { shortenAddress } from '@app/utils/utils'

import { TabWrapper } from '../../../TabWrapper'

const Container = styled(TabWrapper)(
  cacheableComponentStyles,
  ({ theme }) => css`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    overflow: hidden;

    & > * {
      border-bottom: 1px solid ${theme.colors.border};

      &:last-child {
        border-bottom: none;
      }
    }
  `,
)

const HeadingContainer = styled.div(
  ({ theme }) => css`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    padding: ${theme.space['4']};

    font-weight: ${theme.fontWeights.bold};
    font-size: ${theme.fontSizes.headingFour};

    ${mq.sm.min(css`
      padding: ${theme.space['6']};
    `)}
  `,
)

const AeroplaneIcon = styled.svg(
  ({ theme }) => css`
    display: block;
    width: ${theme.space['4']};
    height: ${theme.space['4']};
  `,
)

const OwnerContainer = styled.div(
  ({ theme }) => css`
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    padding: ${theme.space['4']};

    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: ${theme.colors.backgroundSecondary};
    }

    ${mq.sm.min(css`
      padding: ${theme.space['4']} ${theme.space['6']};
    `)}
  `,
)

const Name = styled(Typography)(
  ({ theme }) => css`
    color: ${theme.colors.text};
    font-weight: ${theme.fontWeights.bold};
    font-size: ${theme.fontSizes.body};
  `,
)

const TextContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0;

    & > div:last-of-type {
      font-size: ${theme.fontSizes.small};
      color: ${theme.colors.textTertiary};
    }
  `,
)

const OwnerDetailContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: ${theme.space['2']};
  `,
)

const Owner = ({ address, label }: OwnerItem) => {
  const { t } = useTranslation('common')
  const primary = usePrimaryName({ address })

  return (
    <BaseLinkWithHistory passHref href={`/address/${address}`}>
      <OwnerContainer as="a">
        <OwnerDetailContainer>
          <AvatarWithZorb
            label={primary.data?.name || address}
            address={address}
            name={primary.data?.name}
            size="10"
          />
          <TextContainer>
            <Name ellipsis data-testid={`owner-button-name-${label}`}>
              {primary.data?.beautifiedName || shortenAddress(address)}
            </Name>
            {primary.data?.name && (
              <Typography data-testid={`owner-button-address-${label}`}>
                {shortenAddress(address)}
              </Typography>
            )}
          </TextContainer>
        </OwnerDetailContainer>
        <Tag colorStyle="accentSecondary">{t(label)}</Tag>
      </OwnerContainer>
    </BaseLinkWithHistory>
  )
}

const DNSOwnerSectionContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: ${theme.space['4']};
    padding: ${theme.space['4']};

    ${mq.sm.min(css`
      padding: ${theme.space['6']};
    `)}
  `,
)

const ButtonsContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: ${theme.space['4']};
  `,
)

const DNSOwnerSection = ({
  name,
  owners,
  canSend,
  isWrapped,
}: {
  name: string
  owners: ReturnType<typeof useOwners>
  canSend: boolean
  isWrapped: boolean
}) => {
  const { address } = useAccount()
  const { t } = useTranslation('profile')
  const { createTransactionFlow } = useTransactionFlow()
  const queryClient = useQueryClient()

  const canShow = useMemo(() => {
    let hasMatchingAddress = false
    let hasMismatchingAddress = false
    let hasDNSOwner = false
    for (const owner of owners) {
      if (owner.address === address) {
        hasMatchingAddress = true
      } else {
        hasMismatchingAddress = true
      }
      if (owner.label === 'name.dnsOwner') {
        hasDNSOwner = true
      }
    }
    return hasMatchingAddress && hasMismatchingAddress && hasDNSOwner
  }, [owners, address])

  const { data: dnsImportData, isLoading } = useDnsImportData({
    name,
    enabled: canShow && !canSend,
  })

  const handleSyncManager = () => {
    const currentManager = owners.find((owner) => owner.label === 'name.manager')

    createTransactionFlow(`sync-manager-${name}-${address}`, {
      intro: {
        title: ['tabs.more.ownership.dnsOwnerWarning.syncManager', { ns: 'profile' }],
        content: makeIntroItem('SyncManager', { isWrapped, manager: currentManager!.address }),
      },
      transactions: [
        makeTransactionItem('syncManager', {
          address: address!,
          name,
          dnsImportData: dnsImportData!,
        }),
      ],
    })
  }

  const handleRefresh = () => {
    queryClient.resetQueries({ exact: true, queryKey: ['getDNSOwner', name] })
  }

  if (!canShow) return null

  return (
    <DNSOwnerSectionContainer>
      <Helper type="warning" alignment="horizontal">
        {t(`tabs.more.ownership.dnsOwnerWarning.${canSend ? 'isManager' : 'isDnsOwner'}`)}
      </Helper>
      <ButtonsContainer>
        <Button width="auto" colorStyle="accentSecondary" onClick={handleRefresh}>
          {t('tabs.more.ownership.refreshDNS')}
        </Button>
        {!canSend && (
          <Button
            width="auto"
            onClick={handleSyncManager}
            loading={isLoading}
            disabled={!dnsImportData}
          >
            {t('tabs.more.ownership.dnsOwnerWarning.syncManager')}
          </Button>
        )}
      </ButtonsContainer>
    </DNSOwnerSectionContainer>
  )
}

const Ownership = ({
  name,
  owners,
  canSend,
  canSendError,
  isCachedData,
  isWrapped,
}: {
  name: string
  owners: ReturnType<typeof useOwners>
  canSend: boolean
  canSendError?: string
  isCachedData: boolean
  isWrapped: boolean
}) => {
  const { t } = useTranslation('profile')

  const { usePreparedDataInput } = useTransactionFlow()
  const showSendNameInput = usePreparedDataInput('SendName')
  const handleSend = () => {
    showSendNameInput(`send-name-${name}`, {
      name,
    })
  }

  return (
    <Container $isCached={isCachedData}>
      <HeadingContainer>
        <Typography fontVariant="headingFour">{t('tabs.more.ownership.label')}</Typography>
        <div>
          {canSend && (
            <Button
              size="small"
              prefix={<AeroplaneIcon as={AeroplaneSVG} />}
              onClick={handleSend}
              data-testid="send-name-button"
            >
              {t('action.send', { ns: 'common' })}
            </Button>
          )}
          {!canSend && canSendError && (
            <DisabledButtonWithTooltip
              {...{
                content: t(`errors.${canSendError}`),
                buttonId: 'send-name-disabled-button',
                buttonText: t('action.send', { ns: 'common' }),
                mobileWidth: 150,
                mobileButtonWidth: 'initial',
                prefix: <AeroplaneIcon as={AeroplaneSVG} />,
              }}
            />
          )}
        </div>
      </HeadingContainer>
      {owners.map((owner) => (
        <Owner key={`${owner.address}-${owner.label}`} {...owner} />
      ))}
      <DNSOwnerSection {...{ name, owners, canSend, isWrapped }} />
    </Container>
  )
}

export default Ownership
