'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthModalStore } from '@/store/authModal'
import { useAuthStore } from '@/store/auth'
import api from '@/lib/api'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function AuthModal() {
  const { isOpen, defaultTab, redirectAfterLogin, close } = useAuthModalStore()
  const { login } = useAuthStore()
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
    reset: resetLogin,
  } = useForm<LoginRequest>()

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors, isSubmitting: isSignupSubmitting },
    reset: resetSignup,
    watch,
  } = useForm<RegisterRequest & { confirmPassword: string; agreeToTerms: boolean }>()

  const password = watch('password')

  const onLogin = async (data: LoginRequest) => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', data)
      login(response.data)
      toast.success(`Welcome back, ${response.data.user.firstName}!`)
      close()
      resetLogin()
      if (redirectAfterLogin) router.push(redirectAfterLogin)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Invalid credentials'
      toast.error(msg)
    }
  }

  const onRegister = async (
    data: RegisterRequest & { confirmPassword: string; agreeToTerms: boolean },
  ) => {
    const { confirmPassword: _c, agreeToTerms: _a, ...payload } = data
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', payload)
      login(response.data)
      toast.success(`Welcome to NEXUS, ${response.data.user.firstName}!`)
      close()
      resetSignup()
      if (redirectAfterLogin) router.push(redirectAfterLogin)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Registration failed'
      toast.error(msg)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-slide-up">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Gold accent */}
            <div className="h-0.5 gold-gradient" />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-beige">
                    Welcome to{' '}
                    <span className="gold-text-gradient">Luxe Store</span>
                  </h2>
                  <p className="text-sm text-beige-muted mt-1">
                    Sign in to unlock your full experience
                  </p>
                </div>
                <Dialog.Close asChild>
                  <button className="w-8 h-8 flex items-center justify-center rounded text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              </div>

              <Tabs.Root defaultValue={defaultTab} key={defaultTab}>
                <Tabs.List className="flex gap-1 bg-surface-2 rounded-lg p-1 mb-6">
                  {(['login', 'register'] as const).map((tab) => (
                    <Tabs.Trigger
                      key={tab}
                      value={tab}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200',
                        'data-[state=active]:bg-gold data-[state=active]:text-background',
                        'data-[state=inactive]:text-beige-muted data-[state=inactive]:hover:text-beige',
                      )}
                    >
                      {tab === 'login' ? 'Sign In' : 'Create Account'}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                {/* Login Tab */}
                <Tabs.Content value="login">
                  <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      leftIcon={<Mail className="w-4 h-4" />}
                      error={loginErrors.email?.message}
                      {...registerLogin('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+$/, message: 'Invalid email' },
                      })}
                    />
                    <div className="relative">
                      <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        leftIcon={<Lock className="w-4 h-4" />}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        }
                        error={loginErrors.password?.message}
                        {...registerLogin('password', {
                          required: 'Password is required',
                          minLength: { value: 6, message: 'At least 6 characters' },
                        })}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-xs text-gold hover:text-gold-light transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      isLoading={isLoginSubmitting}
                    >
                      Sign In
                    </Button>

                    <div className="relative flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-beige-muted">OR</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-3 py-2.5 border border-gold/30 rounded text-sm text-beige hover:border-gold hover:bg-gold/5 transition-all duration-200"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </form>
                </Tabs.Content>

                {/* Register Tab */}
                <Tabs.Content value="register">
                  <form onSubmit={handleSignupSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="First Name"
                        placeholder="John"
                        leftIcon={<User className="w-4 h-4" />}
                        error={signupErrors.firstName?.message}
                        {...registerSignup('firstName', { required: 'Required' })}
                      />
                      <Input
                        label="Last Name"
                        placeholder="Doe"
                        error={signupErrors.lastName?.message}
                        {...registerSignup('lastName', { required: 'Required' })}
                      />
                    </div>
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      leftIcon={<Mail className="w-4 h-4" />}
                      error={signupErrors.email?.message}
                      {...registerSignup('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+$/, message: 'Invalid email' },
                      })}
                    />
                    <Input
                      label="Phone (optional)"
                      type="tel"
                      placeholder="+91 98765 43210"
                      leftIcon={<Phone className="w-4 h-4" />}
                      {...registerSignup('phone')}
                    />
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      leftIcon={<Lock className="w-4 h-4" />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      }
                      error={signupErrors.password?.message}
                      {...registerSignup('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'At least 8 characters' },
                      })}
                    />
                    <Input
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      leftIcon={<Lock className="w-4 h-4" />}
                      error={signupErrors.confirmPassword?.message}
                      {...registerSignup('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (val: string | undefined) =>
                          val === password || 'Passwords do not match',
                      })}
                    />

                    <label className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-4 h-4 accent-gold"
                        {...registerSignup('agreeToTerms', {
                          required: 'You must agree to the terms',
                        })}
                      />
                      <span className="text-xs text-beige-muted leading-relaxed">
                        I agree to the{' '}
                        <a href="/terms" className="text-gold hover:text-gold-light underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-gold hover:text-gold-light underline">
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {signupErrors.agreeToTerms && (
                      <p className="text-xs text-error">{signupErrors.agreeToTerms.message}</p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      isLoading={isSignupSubmitting}
                    >
                      Create Account
                    </Button>
                  </form>
                </Tabs.Content>
              </Tabs.Root>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
