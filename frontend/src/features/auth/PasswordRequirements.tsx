import { Check, X } from 'lucide-react'
import { PASSWORD_REQUIREMENTS } from './password-policy'

export function PasswordRequirements({ value }: { value: string }) {
  return <ul className="space-y-1.5" aria-label="Requisitos de contraseña">
    {PASSWORD_REQUIREMENTS.map((requirement) => {
      const valid = requirement.test(value)
      return <li key={requirement.label} className={`flex items-center gap-2 text-xs ${valid ? 'text-green-400' : 'text-muted-dark'}`}>
        {valid ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
        {requirement.label}
      </li>
    })}
  </ul>
}
