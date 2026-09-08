import Select, { type StylesConfig } from 'react-select'
import type { ReactNode } from 'react'

export type SelectOption = {
  label: string
  value: string
}

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 10,
    borderColor: state.selectProps['aria-invalid'] ? 'var(--shell-expense)' : 'var(--shell-border)',
    backgroundColor: 'var(--shell-panel-2)',
    boxShadow: state.isFocused
      ? state.selectProps['aria-invalid']
        ? '0 0 0 2px rgba(244, 63, 94, 0.2)'
        : '0 0 0 1px rgba(20, 184, 166, 0.55)'
      : state.selectProps['aria-invalid']
        ? '0 0 0 1px rgba(244, 63, 94, 0.22)'
        : 'none',
    '&:hover': {
      borderColor: state.selectProps['aria-invalid']
        ? 'var(--shell-expense)'
        : 'rgba(20, 184, 166, 0.55)',
    },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 11px' }),
  singleValue: (base) => ({ ...base, color: 'var(--shell-text)', fontSize: 12 }),
  placeholder: (base) => ({ ...base, color: 'var(--shell-muted)', fontSize: 12 }),
  input: (base) => ({ ...base, color: 'var(--shell-text)', fontSize: 12 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--shell-muted)', padding: '0 10px' }),
  clearIndicator: (base) => ({ ...base, color: 'var(--shell-muted)' }),
  menu: (base) => ({
    ...base,
    zIndex: 1,
    overflow: 'hidden',
    border: '1px solid var(--shell-border)',
    borderRadius: 12,
    backgroundColor: 'var(--shell-panel)',
    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)',
  }),
  menuList: (base) => ({ ...base, padding: 5 }),
  menuPortal: (base) => ({ ...base, zIndex: 1000 }),
  option: (base, state) => ({
    ...base,
    borderRadius: 8,
    color: state.isSelected ? 'var(--shell-primary)' : 'var(--shell-secondary)',
    backgroundColor: state.isSelected
      ? 'rgba(20, 184, 166, 0.1)'
      : state.isFocused
        ? 'rgba(20, 184, 166, 0.08)'
        : 'transparent',
    cursor: 'pointer',
    fontSize: 12,
  }),
}

export function AppSelect({
  value,
  options,
  onChange,
  onBlur,
  placeholder,
  invalid = false,
  describedBy,
  isSearchable = false,
  isClearable = false,
  formatOptionLabel,
}: {
  value?: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  invalid?: boolean
  describedBy?: string
  isSearchable?: boolean
  isClearable?: boolean
  formatOptionLabel?: (option: SelectOption) => ReactNode
}) {
  const selectedOption = options.find((option) => option.value === value) ?? null

  return (
    <Select<SelectOption, false>
      classNamePrefix="app-select"
      className={invalid ? 'field--invalid' : undefined}
      value={selectedOption}
      options={options}
      styles={selectStyles}
      placeholder={placeholder}
      isSearchable={isSearchable}
      isClearable={isClearable}
      formatOptionLabel={formatOptionLabel}
      menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
      menuPosition="fixed"
      aria-invalid={invalid}
      aria-describedby={describedBy}
      onChange={(option) => onChange(option?.value ?? '')}
      onBlur={onBlur}
    />
  )
}
