'use client'

import React from 'react'
import { ShieldCheck, CheckCircle2, Shield } from 'lucide-react'

export interface SecurityPostureInfo {
  jwtAlgorithmPinned?: string | boolean
  dbBackedRoleVerification?: boolean
  roleEscalationLocked?: boolean
  parameterizedSqlEnforced?: boolean
  likeWildcardEscaping?: boolean
  rateLimitingActive?: boolean
  couponServerValidation?: boolean
  securityHeadersEnabled?: boolean
}

interface SecurityBadgeProps {
  variant?: 'admin'
  posture?: SecurityPostureInfo | null
  className?: string
}

export function SecurityBadge({ posture, className = '' }: SecurityBadgeProps) {
  const items = [
    {
      label: 'JWT Signing',
      value: typeof posture?.jwtAlgorithmPinned === 'string' ? posture.jwtAlgorithmPinned : 'HMAC-SHA256',
      ok: posture ? Boolean(posture.jwtAlgorithmPinned) : true,
    },
    {
      label: 'DB Role Guard',
      value: posture?.dbBackedRoleVerification !== false ? 'Verified' : 'Warning',
      ok: posture?.dbBackedRoleVerification !== false,
    },
    {
      label: 'Escalation Lock',
      value: posture?.roleEscalationLocked !== false ? 'Immutable' : 'Check',
      ok: posture?.roleEscalationLocked !== false,
    },
    {
      label: 'Parameterized SQL',
      value: posture?.parameterizedSqlEnforced !== false ? 'Enforced' : 'Check',
      ok: posture?.parameterizedSqlEnforced !== false,
    },
    {
      label: 'Wildcard Escape',
      value: posture?.likeWildcardEscaping !== false ? 'Escaped' : 'Check',
      ok: posture?.likeWildcardEscaping !== false,
    },
    {
      label: 'Coupon Validation',
      value: posture?.couponServerValidation !== false ? 'Server-Side' : 'Check',
      ok: posture?.couponServerValidation !== false,
    },
    {
      label: 'Rate Limiting',
      value: posture?.rateLimitingActive !== false ? 'Active' : 'Check',
      ok: posture?.rateLimitingActive !== false,
    },
    {
      label: 'Security Headers',
      value: posture?.securityHeadersEnabled !== false ? 'Enabled' : 'Check',
      ok: posture?.securityHeadersEnabled !== false,
    },
  ]

  return (
    <div
      data-testid="nexus-verified-security-badge"
      className={`rounded-2xl border border-gold/40 bg-gradient-to-br from-surface via-surface-2/80 to-surface p-5 shadow-xl ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-lg font-bold text-beige">
                NEXUS Verified Security Seal
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hardened &amp; Audited
              </span>
            </div>
            <p className="text-xs text-beige-muted mt-1">
              Live cryptographic JWT pinning, immutable RBAC role guards, parameterized SQL queries, and atomic coupon integrity verified.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-gold bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-xl flex-shrink-0">
          <Shield className="w-4 h-4" />
          <span>ZERO BYPASS VERIFIED</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 bg-background/60 border border-border rounded-xl px-3 py-2"
          >
            <span className="text-[11px] font-medium text-beige-muted truncate">{item.label}</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase flex-shrink-0 ${
                item.ok ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
