import { useEffect, useRef, useState } from 'react'
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
import { Icon } from './icon'
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
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function selectIcon(name: string) {
    onChange(name)
    setOpen(false)
    onBlur()
  }

  return (
    <div className="icon-picker" ref={pickerRef}>
      <button
        type="button"
        className={`icon-picker__trigger${invalid ? ' field--invalid' : ''}`}
        aria-label={t('categories.chooseIcon')}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        onBlur={onBlur}
      >
        <Icon name={value} size={21} />
        <span>{t('categories.chooseIcon')}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className="icon-picker__menu" role="listbox" aria-label={t('categories.chooseIcon')}>
          {categoryIconOptions.map(({ name, component: Component }) => (
            <button
              type="button"
              role="option"
              aria-selected={value === name}
              aria-label={name}
              className={`icon-picker__option${value === name ? ' is-selected' : ''}`}
              key={name}
              title={name}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectIcon(name)}
            >
              <Component size={21} strokeWidth={1.8} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
