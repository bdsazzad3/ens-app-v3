import { Dispatch, forwardRef, ReactNode, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { Address, getAddress } from 'viem'
import { useAccount } from 'wagmi'

import { RadioButton, RadioButtonGroup, Tag, Typography } from '@ensdomains/thorin'

import { Outlink } from '@app/components/Outlink'
import { useChainId } from '@app/hooks/chain/useChainId'
import { useDnsOffchainStatus } from '@app/hooks/dns/useDnsOffchainStatus'
import { useDnsSecEnabled } from '@app/hooks/dns/useDnsSecEnabled'
import { useDnsOwner } from '@app/hooks/ensjs/dns/useDnsOwner'
import { useResolver } from '@app/hooks/ensjs/public/useResolver'

import { DnsImportActionButton, DnsImportCard, DnsImportHeading } from '../shared'
import {
  DnsImportReducerAction,
  DnsImportReducerDataItem,
  DnsImportType,
  DnsStep,
  SelectedItemProperties,
} from '../useDnsImportReducer'
import { checkDnsAddressMatch } from '../utils'

const TypesSelectionContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: ${theme.space['2']};
    max-width: 100%;
  `,
)

const StyledRadioButtonGroup = styled(RadioButtonGroup)(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0;
    border-radius: ${theme.radii.large};
    border: 1px solid ${theme.colors.border};

    & > :first-child {
      border-bottom: 1px solid ${theme.colors.border};
    }
  `,
)

const TypeLabelContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: ${theme.space['1']};
    overflow: hidden;
    word-wrap: normal;

    &[aria-disabled='true'] {
      opacity: 0.5;
    }
  `,
)

const TypeLabelHeading = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: ${theme.space['2']};
  `,
)

const RadioButtonContainer = styled.div(
  ({ theme }) => css`
    & > div {
      padding: ${theme.space['4']};
    }
  `,
)

const TypeRadioButton = forwardRef<
  HTMLInputElement,
  { type: NonNullable<DnsImportType>; tag: string; description: ReactNode }
>(({ type, tag, description }, ref) => {
  return (
    <RadioButtonContainer ref={ref}>
      <RadioButton
        name="RadioButtonGroup"
        value={type}
        label={
          <TypeLabelContainer>
            <TypeLabelHeading>
              <Typography fontVariant="bodyBold">{type}</Typography>
              <Tag colorStyle="accentSecondary">{tag}</Tag>
            </TypeLabelHeading>
            {description}
          </TypeLabelContainer>
        }
      />
    </RadioButtonContainer>
  )
})
TypeRadioButton.displayName = 'TypeRadioButton'

/* eslint-disable @typescript-eslint/naming-convention */
const offchainResolverMap = {
  '1': '0xF142B308cF687d4358410a4cB885513b30A42025',
  '17000': '0x7CF33078a37Cee425F1ad149875eE1e4Bdf0aD9B',
  '11155111': '0x179Be112b24Ad4cFC392eF8924DfA08C20Ad8583',
} as Record<string, Address | undefined>
/* eslint-enable @typescript-eslint/naming-convention */

export const SelectImportType = ({
  dispatch,
  item,
  selected,
}: {
  dispatch: Dispatch<DnsImportReducerAction>
  item: DnsImportReducerDataItem
  selected: SelectedItemProperties
}) => {
  const { t } = useTranslation('dnssec', { keyPrefix: 'steps.selectType' })
  const { t: tc } = useTranslation('common')

  const { address } = useAccount()
  const chainId = useChainId()
  const { data: tldResolver } = useResolver({ name: selected.name.split('.')[1] })

  const tldResolverIsOffchainResolver = useMemo(
    // make addresses checksum-verified
    () =>
      tldResolver != null && getAddress(tldResolver) === getAddress(offchainResolverMap[chainId]!),
    [tldResolver, chainId],
  )

  const { data: isDnsSecEnabled, isLoading: isDnsSecEnabledLoading } = useDnsSecEnabled({
    name: selected.name,
  })

  const { data: dnsOwner, isLoading: isDnsOwnerLoading } = useDnsOwner({ name: selected.name })
  const { data: offchainDnsStatus, isLoading: isOffchainDnsStatusLoading } = useDnsOffchainStatus({
    name: selected.name,
    enabled: item.type === 'offchain',
  })

  const dnsOwnerStatus = useMemo(
    () => checkDnsAddressMatch({ address, dnsAddress: dnsOwner }),
    [address, dnsOwner],
  )

  const setStepsAndNavigate = () => {
    const steps = ['selectType'] as DnsStep[]
    if (!isDnsSecEnabled) steps.push('enableDnssec')
    if (item.type === 'offchain') {
      if (
        !offchainDnsStatus ||
        offchainDnsStatus.resolver?.status !== 'matching' ||
        offchainDnsStatus.address?.status !== 'matching'
      )
        steps.push('verifyOffchainOwnership')
      steps.push('completeOffchain')
    } else {
      if (!dnsOwner || dnsOwnerStatus !== 'matching') steps.push('verifyOnchainOwnership')
      steps.push('transaction')
      steps.push('completeOnchain')
    }
    dispatch({ name: 'setSteps', selected, payload: steps })
    dispatch({ name: 'increaseStep', selected })
  }

  return (
    <DnsImportCard>
      <DnsImportHeading>{t('title', { name: selected.name })}</DnsImportHeading>
      <Typography>{t('subtitle')}</Typography>
      <Outlink href="https://example.com">{t('learnMore')}</Outlink>
      <TypesSelectionContainer>
        <Typography weight="bold">{t('select.heading')}</Typography>
        <StyledRadioButtonGroup
          value={item.type || undefined}
          onChange={(e) => {
            dispatch({ name: 'setType', selected, payload: e.target.value as DnsImportType })
          }}
        >
          <RadioButtonContainer>
            <RadioButton
              disabled={!tldResolverIsOffchainResolver}
              name="RadioButtonGroup"
              value="offchain"
              label={
                <TypeLabelContainer aria-disabled={!tldResolverIsOffchainResolver}>
                  <TypeLabelHeading>
                    <Typography fontVariant="bodyBold">{t('select.offchain.name')}</Typography>
                    <Tag colorStyle="accentSecondary">{t('select.offchain.tag')}</Tag>
                  </TypeLabelHeading>
                  <Typography fontVariant="small">
                    <Trans
                      t={t}
                      i18nKey="select.offchain.description"
                      components={{
                        br: <br />,
                        b: <b />,
                      }}
                    />
                  </Typography>
                </TypeLabelContainer>
              }
              defaultChecked={item.type === 'offchain'}
            />
          </RadioButtonContainer>
          <RadioButtonContainer>
            <RadioButton
              name="RadioButtonGroup"
              value="onchain"
              label={
                <TypeLabelContainer>
                  <TypeLabelHeading>
                    <Typography fontVariant="bodyBold">{t('select.onchain.name')}</Typography>
                  </TypeLabelHeading>
                  <Typography fontVariant="small">{t('select.onchain.description')}</Typography>
                </TypeLabelContainer>
              }
              defaultChecked={item.type === 'onchain'}
            />
          </RadioButtonContainer>
        </StyledRadioButtonGroup>
      </TypesSelectionContainer>
      <DnsImportActionButton
        disabled={
          !item.type || isDnsSecEnabledLoading || isDnsOwnerLoading || isOffchainDnsStatusLoading
        }
        onClick={() => setStepsAndNavigate()}
      >
        {tc('action.next')}
      </DnsImportActionButton>
    </DnsImportCard>
  )
}
