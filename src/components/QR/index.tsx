"use client"

import React, { useEffect, useState } from "react"
import NavBar from "../common/NavBar"
import TypeWriter from "../common/TypeWritter"
import GenerateQR from "@/components/QR/GenerateQR"
import { Copy, Delete, Download, Save } from "lucide-react"
import toast from "react-hot-toast"
import { useAppSelector } from "@/hook/redux"
import { deleteApi, getApi, postApi } from "@/utils/common"
import { ApiResponse } from "@/utils/api"
import { GET_QR, POST_QR, REMOVE_QR } from "@/utils/APIConstant"
import { AppUrl } from "@/utils/constants"

type QRItem = {
  _id: string
  name: string
  merchantId: string
  createdAt: string
}

const BASE_URL = AppUrl;

const GenerateQRPage = () => {
  const merchantId = useAppSelector(state => state.merchant).merchant?._id;
  const [inputName, setInputName] = useState("")
  const [previewQR, setPreviewQR] = useState("")
  const [qrs, setQrs] = useState<QRItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQRs = async () => {
      try {
        const res = await getApi<ApiResponse<QRItem[]>>({
          url: GET_QR
        })

        if (!res?.success) return
        setQrs(res?.data)
      } catch (err) {
        toast.error("Failed to load QR codes")
      } finally {
        setLoading(false)
      }
    }

    fetchQRs()
  }, [])

  const buildQRValue = (merchantId: string, name: string) =>
    `${BASE_URL}/consumer/${merchantId}?table=${encodeURIComponent(name)}`

  const handlePreview = () => {
    if (!inputName.trim()) {
      toast.error("Please enter a name")
      return
    }

    if (!merchantId) {
      toast.error("Merchant not loaded yet")
      return
    }

    // Same url the saved QR will carry, so the preview is not a different link.
    setPreviewQR(buildQRValue(merchantId, inputName.trim()))
  }

  const handleSaveQR = async () => {
    if (!inputName.trim()) return

    try {
      toast.loading("Creating QR...", { id: "create-qr" })

      const res = await postApi<ApiResponse<QRItem>>({
        url: POST_QR,
        values: { name: inputName.trim() }
      })

      if (!res?.success) {
        throw new Error(res?.message)
      }

      setQrs((p) => [res?.data, ...p])
      setInputName("")
      setPreviewQR("")
      toast.success("QR created", { id: "create-qr" })
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to create QR",
        { id: "create-qr" }
      )
    }
  }

  const handleDelete = async (id: string) => {
    try {
      toast.loading("Deleting QR...", { id: "delete-qr" })

      const res = await deleteApi<ApiResponse<any>>({
        url: REMOVE_QR,
        param: { id }
      })

      if (!res?.success) {
        throw new Error(res?.message)
      }

      setQrs((p) => p.filter((qr) => qr._id !== id))
      toast.success("QR deleted", { id: "delete-qr" })
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to delete QR",
        { id: "delete-qr" }
      )
    }
  }

  const handleCopy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success("Link copied")
    } catch {
      // Clipboard needs https / permission, so fall back to selecting the text.
      toast.error("Could not copy - select the link and copy it manually")
    }
  }

  const handleDownload = (domId: string, name: string) => {
    const canvas = document.querySelector(
      `#${domId} canvas`
    ) as HTMLCanvasElement | null

    if (!canvas) return

    const link = document.createElement("a")
    link.download = `qr-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="min-h-screen bg-[#F8F5F0]">
      <NavBar />

      {/* HEADER */}
      <header className="text-center pt-24 px-6">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900">
          Generate Your
          <span className="ml-3 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            <TypeWriter content={["QR Code"]} lp />
          </span>
        </h1>

        <p className="mt-6 text-gray-600 max-w-2xl mx-auto text-lg">
          Create and manage QR codes for your digital menu.
        </p>
      </header>

      {/* CREATE */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-2xl bg-white shadow-sm p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="space-y-6 w-full md:w-1/2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  QR Name (Table, Counter, VIP)
                </label>
                <input
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <button
                onClick={handlePreview}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 font-semibold text-white"
              >
                Preview QR
              </button>

              {previewQR && (
                <button
                  onClick={handleSaveQR}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border py-3"
                >
                  <Save size={18} /> Save QR Code
                </button>
              )}
            </div>

            <div className="mt-6 md:mt-0">
              <GenerateQR value={previewQR} id="qr-preview" maxSize={280} />
            </div>
          </div>
        </div>
      </section>

      {/* LIST */}
      {!loading && qrs.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-32">
          <h2 className="text-2xl font-bold mb-8">Saved QR Codes</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {qrs.map((qr) => {
              const value = buildQRValue(qr.merchantId, qr.name)
              const domId = `qr-${qr._id}`

              return (
                <div
                  key={qr._id}
                  className="group relative rounded-xl bg-white p-6 shadow-lg"
                >
                  {/* The hover actions cover only the code, so the link below
                      stays selectable instead of being blocked by an overlay. */}
                  <div className="relative">
                    <GenerateQR
                      id={domId}
                      value={value}
                      maxSize={140}
                      showLabel={false}
                    />

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 bg-white/70 backdrop-blur transition">
                      <button
                        onClick={() => handleDownload(domId, qr.name)}
                        title="Download PNG"
                        className="rounded-full bg-white p-3 shadow cursor-pointer"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(qr._id)}
                        title="Delete QR"
                        className="rounded-full bg-white p-3 shadow text-red-600 cursor-pointer"
                      >
                        <Delete size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-center font-medium truncate">
                    {qr.name}
                  </p>

                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-gray-50 px-2 py-2">
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 break-all select-all text-xs text-gray-600 hover:text-pink-600"
                    >
                      {value}
                    </a>
                    <button
                      onClick={() => handleCopy(value)}
                      title="Copy link"
                      className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-white hover:text-gray-900 cursor-pointer"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* <Footer /> */}
    </div>
  )
}

export default GenerateQRPage
