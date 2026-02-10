"use client"

import { useState, useEffect } from "react"
import { getCompany } from "@/actions/company"

export interface SystemConfig {
  name: string
  rif: string
  address: string
  phone: string
  email: string
  logo_url?: string | null
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConfig() {
        try {
            const res = await getCompany()
            if (res.success && res.data) {
                setConfig({
                    name: res.data.name || "Escritorio Legal",
                    rif: res.data.rif || "",
                    address: res.data.address || "",
                    phone: res.data.phone || "",
                    email: res.data.email || "",
                    logo_url: res.data.logo_url
                })
            }
        } catch (error) {
            console.error("Error fetching system config:", error)
        } finally {
            setLoading(false)
        }
    }

    fetchConfig()
  }, [])

  return { config, loading }
}
