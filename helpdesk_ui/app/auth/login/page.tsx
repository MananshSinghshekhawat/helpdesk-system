'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, Loader2, ShieldCheck, KeyRound, Sparkles } from 'lucide-react'
import { sendOtp, verifyOtp } from '@/lib/api'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [shakeOtp, setShakeOtp] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const emailRef = useRef<HTMLInputElement>(null)

  // Auth Guard: Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      router.push('/dashboard')
    }
  }, [router])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Auto-focus email input
  useEffect(() => {
    if (step === 'email') emailRef.current?.focus()
  }, [step])

  // Auto-focus first OTP input
  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus()
  }, [step])

  // Handle send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      await sendOtp({ email })
      setSuccess('OTP sent successfully! Check your email.')
      setStep('otp')
      setResendCooldown(30)
      setOtp(Array(6).fill(''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setError('')

    // Auto-move to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    const fullOtp = newOtp.join('')
    if (fullOtp.length === 6) {
      handleVerifyOtp(fullOtp)
    }
  }

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pastedData) return

    const newOtp = Array(6).fill('')
    pastedData.split('').forEach((char, i) => {
      newOtp[i] = char
    })
    setOtp(newOtp)

    // Focus last filled input or submit
    const lastIndex = Math.min(pastedData.length - 1, 5)
    otpRefs.current[lastIndex]?.focus()

    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData)
    }
  }

  // Handle OTP keydown for backspace navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Verify OTP
  const handleVerifyOtp = useCallback(
    async (otpString?: string) => {
      const otpValue = otpString || otp.join('')
      if (otpValue.length !== 6) {
        setError('Please enter all 6 digits')
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await verifyOtp({ email, otp: otpValue })

        // Store JWT token
        localStorage.setItem('access_token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))

        setSuccess('Login successful! Redirecting...')

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid OTP'
        setError(message)
        setShakeOtp(true)
        setTimeout(() => setShakeOtp(false), 600)
        // Clear OTP inputs
        setOtp(Array(6).fill(''))
        otpRefs.current[0]?.focus()
      } finally {
        setLoading(false)
      }
    },
    [email, otp, router]
  )

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await sendOtp({ email })
      setSuccess('OTP resent successfully!')
      setResendCooldown(30)
      setOtp(Array(6).fill(''))
      otpRefs.current[0]?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  // Go back to email step
  const handleBack = () => {
    setStep('email')
    setOtp(Array(6).fill(''))
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,var(--color-primary)/10%,transparent_70%),radial-gradient(ellipse_at_80%_100%,var(--color-primary)/5%,transparent_60%)]" />
      <div className="absolute rounded-full blur-[80px] pointer-events-none opacity-15 w-[400px] h-[400px] bg-primary opacity-20 dark:opacity-10 -top-[100px] -right-[100px] animate-[pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
      <div className="absolute rounded-full blur-[80px] pointer-events-none opacity-15 w-[300px] h-[300px] bg-accent opacity-20 dark:opacity-10 -bottom-[50px] -left-[50px] animate-[pulse_7s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
      <div className="absolute rounded-full blur-[80px] pointer-events-none opacity-15 w-[200px] h-[200px] bg-primary opacity-20 dark:opacity-10 top-[40%] left-[60%] animate-[pulse_5s_cubic-bezier(0.4,0,0.6,1)_infinite]" />

      <div
        className={`w-full max-w-md relative z-10 transition-all duration-500 rounded-[1.25rem] p-10 bg-card/80 border border-border backdrop-blur-2xl shadow-2xl hover:shadow-[0_20px_40px_-10px_var(--color-primary)/15%]`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 shadow-lg shadow-primary/30 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]">
              <img src="/favicon.ico" alt="CreditQ Logo" className="w-8 h-8 object-contain drop-shadow-md" />
            </div>
          </div>

          {step === 'email' ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2 animate-in fade-in zoom-in-95 duration-500">
                CreditQ Helpdesk
              </h1>
              <p className="text-muted-foreground animate-in fade-in zoom-in-95 duration-500 delay-100 fill-mode-both">
                Sign in to your CreditQ helpdesk account
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2 animate-in fade-in zoom-in-95 duration-500">
                Verify OTP
              </h1>
              <p className="text-muted-foreground animate-in fade-in zoom-in-95 duration-500 delay-100 fill-mode-both">
                Enter the 6-digit code sent to
              </p>
              <p className="text-sm font-medium text-primary mt-1 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
                {email}
              </p>
            </>
          )}
        </div>

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  disabled={loading}
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl text-foreground text-[0.95rem] transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-6 animate-in fade-in zoom-in-95 duration-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-2 flex-shrink-0 mt-1.5" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 inline-flex items-center justify-center gap-2 font-semibold text-[0.95rem] rounded-xl border-none cursor-pointer bg-gradient-to-br from-primary to-accent text-primary-foreground transition-all duration-300 shadow-md shadow-primary/25 hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg hover:enabled:shadow-primary/35 active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Send OTP
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* OTP Inputs */}
            <div className="flex justify-center">
              <div
                className={`flex gap-3 ${shakeOtp ? 'animate-[shake_0.5s_ease]' : ''}`}
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={loading}
                    className="w-12 h-14 text-center text-2xl font-bold font-mono bg-background border-[1.5px] border-input rounded-xl text-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 focus:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    id={`otp-input-${index}`}
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-6 animate-in fade-in zoom-in-95 duration-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-2 flex-shrink-0 mt-1.5" />
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm leading-6 animate-in fade-in zoom-in-95 duration-500">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3 inline-flex items-center justify-center gap-2 font-semibold text-[0.95rem] rounded-xl border-none cursor-pointer bg-gradient-to-br from-primary to-accent text-primary-foreground transition-all duration-300 shadow-md shadow-primary/25 hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg hover:enabled:shadow-primary/35 active:enabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Verify & Sign In
                </>
              )}
            </button>

            {/* Resend & Back */}
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={handleBack}
                disabled={loading}
                className="text-primary hover:text-accent font-medium bg-none border-none cursor-pointer py-1 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change email
              </button>

              <button
                onClick={handleResendOtp}
                disabled={loading || resendCooldown > 0}
                className="text-primary hover:text-accent font-medium bg-none border-none cursor-pointer py-1 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? (
                  <span className="text-muted-foreground">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  'Resend OTP'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success message for email step */}
        {step === 'email' && success && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm leading-6 mt-4 animate-in fade-in zoom-in-95 duration-500">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {success}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            Protected by CreditQ · Secure OTP Authentication
          </p>
        </div>
      </div>
    </div>
  )
}
