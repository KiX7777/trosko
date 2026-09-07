import { NumericFormat, type NumericFormatProps } from 'react-number-format'

type CurrencyInputProps = Omit<NumericFormatProps, 'value' | 'onValueChange' | 'onChange'> & {
  value?: number | string
  onValueChange: (value: number | undefined) => void
  currency?: string
}

export function CurrencyInput({
  currency = 'EUR',
  value,
  onValueChange,
  ...props
}: CurrencyInputProps) {
  return (
    <NumericFormat
      {...props}
      value={value ?? ''}
      valueIsNumericString={typeof value === 'string'}
      thousandSeparator="."
      decimalSeparator=","
      allowedDecimalSeparators={[',', '.']}
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      inputMode="decimal"
      suffix={` ${currency}`}
      onValueChange={({ floatValue }) => onValueChange(floatValue)}
    />
  )
}
