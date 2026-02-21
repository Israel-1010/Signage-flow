'use client'

import React from "react"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Monitor } from 'lucide-react'

const TEST_EMAIL = 'demo@signageflow.test'
const TEST_PASSWORD = 'demo123456'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingDemo, setIsCreatingDemo] = useState(false)
  const router = useRouter()

  const handleDemoLogin = async () => {
    setIsCreatingDemo(true)
    setError(null)

    const supabase = createClient()

    try {
      console.log("[v0] Demo login attempt...")
      // Try to sign in with demo account
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })

      if (signInError) {
        console.log("[v0] Demo account doesn't exist or password wrong, attempting to create...")
        // If sign in fails, create the demo account
        const { error: signUpError } = await supabase.auth.signUp({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          options: {
            data: {
              full_name: 'Demo User',
            },
          },
        })

        if (signUpError) {
          console.error("[v0] Signup error:", signUpError)
          throw signUpError
        }

        console.log("[v0] Demo account created, attempting login...")
        // Try signing in again after creating account
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        })

        if (retryError) {
          console.error("[v0] Retry login error:", retryError)
          throw retryError
        }
      }

      console.log("[v0] Demo login successful, redirecting...")
      router.push('/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access demo account'
      console.error("[v0] Demo login error:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsCreatingDemo(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Creating Supabase client...")
      const supabase = createClient()
      
      // Verify Supabase configuration
      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }
      
      console.log("[v0] Login attempt with email:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error("[v0] Supabase auth error:", {
          message: error.message,
          status: error.status,
          code: error.code
        })
        
        // Provide helpful error messages
        if (error.status === 500 || error.message?.includes("Database")) {
          throw new Error("Supabase server error. Please check your configuration and try again.")
        }
        
        throw error
      }
      
      if (data?.user) {
        console.log("[v0] Login successful for user:", data.user.id)
      }
      
      console.log("[v0] Redirecting to dashboard...")
      router.push('/dashboard')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login'
      console.error("[v0] Login failed:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2">
            <Monitor className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SignageFlow</span>
          </div>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to manage your digital signage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading || isCreatingDemo}>
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={handleDemoLogin}
                    disabled={isLoading || isCreatingDemo}
                  >
                    {isCreatingDemo ? 'Accessing demo...' : 'Try Demo Account'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/auth/sign-up"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
