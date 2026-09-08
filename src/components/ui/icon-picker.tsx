import {
  Activity,
  Apple,
  Baby,
  Bike,
  BookOpen,
  BriefcaseBusiness,
  Bus,
  CakeSlice,
  Car,
  Cat,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Heart,
  House,
  Laptop,
  Music,
  PawPrint,
  Pencil,
  Pill,
  Pizza,
  Salad,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Stethoscope,
  Train,
  Utensils,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { AppSelect, type SelectOption } from './select'
import { t } from '../../lib/i18n'

export const categoryIconOptions = [
  { name: 'sparkles', component: Sparkles },
  { name: 'shopping-cart', component: ShoppingCart },
  { name: 'shopping-bag', component: ShoppingBag },
  { name: 'house', component: House },
  { name: 'fuel', component: Fuel },
  { name: 'briefcase-business', component: BriefcaseBusiness },
  { name: 'activity', component: Activity },
  { name: 'apple', component: Apple },
  { name: 'baby', component: Baby },
  { name: 'bike', component: Bike },
  { name: 'book-open', component: BookOpen },
  { name: 'bus', component: Bus },
  { name: 'cake', component: CakeSlice },
  { name: 'car', component: Car },
  { name: 'cat', component: Cat },
  { name: 'coffee', component: Coffee },
  { name: 'dumbbell', component: Dumbbell },
  { name: 'gamepad', component: Gamepad2 },
  { name: 'gem', component: Gem },
  { name: 'gift', component: Gift },
  { name: 'graduation-cap', component: GraduationCap },
  { name: 'heart', component: Heart },
  { name: 'laptop', component: Laptop },
  { name: 'music', component: Music },
  { name: 'paw-print', component: PawPrint },
  { name: 'pencil', component: Pencil },
  { name: 'pill', component: Pill },
  { name: 'pizza', component: Pizza },
  { name: 'salad', component: Salad },
  { name: 'shirt', component: Shirt },
  { name: 'smartphone', component: Smartphone },
  { name: 'sofa', component: Sofa },
  { name: 'stethoscope', component: Stethoscope },
  { name: 'train', component: Train },
  { name: 'utensils', component: Utensils },
  { name: 'wifi', component: Wifi },
  { name: 'wrench', component: Wrench },
  { name: 'zap', component: Zap },
] satisfies ReadonlyArray<{ name: string; component: LucideIcon }>

const iconOptions: SelectOption[] = categoryIconOptions.map(({ name }) => ({
  value: name,
  label: name,
}))

function formatIconOption(option: SelectOption): ReactNode {
  const IconComponent = categoryIconOptions.find(({ name }) => name === option.value)?.component
  if (!IconComponent) return option.label

  return (
    <span className="icon-picker__option-label">
      <IconComponent size={19} strokeWidth={1.8} aria-hidden="true" />
      <span>{option.label}</span>
    </span>
  )
}

export function IconPicker({
  value,
  onChange,
  onBlur,
  invalid = false,
  describedBy,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <div className="icon-picker">
      <AppSelect
        value={value}
        options={iconOptions}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={t('categories.chooseIcon')}
        invalid={invalid}
        describedBy={describedBy}
        isSearchable
        formatOptionLabel={formatIconOption}
      />
    </div>
  )
}
