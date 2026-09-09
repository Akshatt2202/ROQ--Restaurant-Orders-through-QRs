"use client"

import { FileBox, Inbox } from 'lucide-react'
import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import Tooltip from '../common/Tooltip'
import { getApi } from '@/utils/common'
import { GET_ALL_ORDER_HISTORY, GET_ORDER_HISTORY } from '@/utils/APIConstant'
import { ApiResponse } from '@/utils/api'
import { OrderHisResponse, OrderHistory, OrderHistoryItem } from '@/types/orderHistory'
import toast from 'react-hot-toast'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function index() {
    const baseRef = React.useRef<HTMLDivElement>(null);
    const cursorRef = React.useRef<Date>(null);
    const hasMore = React.useRef<boolean>(true);
    const [orderHis, setOrderHis] = React.useState<OrderHistory[]>([]);
    const [loading, setLoading] = React.useState(true);
    const loadingRef = React.useRef(false)
    const newestRef = React.useRef<Date | null>(null);
    const pollingRef = React.useRef(false);

    React.useEffect(() => {
        if (!baseRef.current) return;

        const handleIntraction = (entries: IntersectionObserverEntry[]) => {
            if (entries[0].isIntersecting && hasMore.current) {
                // fetch next
                fetchList()
            }
        }

        const observer = new IntersectionObserver(handleIntraction, { threshold: 0, });
        observer.observe(baseRef.current)

        return () => {
            observer.disconnect();
        }
    }, [])

    const fetchList = async () => {
        if (loadingRef.current || !hasMore.current) return;

        loadingRef.current = true;

        const param = new URLSearchParams({});
        if (cursorRef.current) param.set("cursor", String(cursorRef.current));

        const response = await getApi<ApiResponse<OrderHisResponse>>({
            url: GET_ORDER_HISTORY + `?${param.toString()}`
        });

        if (response?.success) {
            const list = response.data.orders;

            hasMore.current = response.data.hasMore;

            cursorRef.current =
                list.length > 0 ? list[list.length - 1].createdAt : null;

            if (!newestRef.current && list.length > 0) {
                newestRef.current = list[0].createdAt;
            }

            setOrderHis(prev => [...prev, ...list]);
        }

        loadingRef.current = false;
        setLoading(false);
    };

    const pollNew = async () => {
        if (pollingRef.current || !newestRef.current) return;

        pollingRef.current = true;

        const param = new URLSearchParams({ since: String(newestRef.current) });

        const response = await getApi<ApiResponse<OrderHisResponse>>({
            url: GET_ORDER_HISTORY + `?${param.toString()}`
        });

        if (response?.success) {
            const list = response.data.orders;

            if (list.length > 0) {
                newestRef.current = list[0].createdAt;
                setOrderHis(prev => [...list, ...prev]);
                toast.success(
                    list.length > 1
                        ? `${list.length} new orders`
                        : `New order received${list[0].tableName ? ` from table ${list[0].tableName}` : ""}`
                );
            }
        }

        pollingRef.current = false;
    };

    React.useEffect(() => {
        const interval = setInterval(pollNew, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchALList = async (): Promise<OrderHistory[]> => {

        const response = await getApi<ApiResponse<OrderHistory[]>>({
            url: GET_ALL_ORDER_HISTORY
        });

        if (response?.success) {
            return response.data
        }

        return [];
    };

    const exportItasPdf = async () => {

        const list = await fetchALList();
        toast.loading("Preparing PDF...", { id: "qr-menu-export-all-pdf" });
        if (list.length === 0) {
            toast.success("No Data to Export");
            return;
        }

        const doc = new jsPDF("p", "mm", "a4");

        const pageWidth = doc.internal.pageSize.width;

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 297, "F");

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, 28, "F");

        doc.setFont("times", "bold");
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text("QR Menu - Order History", pageWidth / 2, 16, { align: "center" });

        doc.setFontSize(10);
        doc.text(
            `Generated: ${new Date().toLocaleDateString()}`,
            pageWidth - 14,
            22,
            { align: "right" }
        );

        const rows = list.map((o, i) => [
            i + 1,
            o.name,
            o.email,
            o.tableName || "Direct",
            o.items.map((item) => `${item.title} x${item.quantity}`).join(", "),
            `${o.amount}`,
            o.status,
            o.paymentId,
            new Date(o.createdAt).toLocaleDateString()
        ]);

        autoTable(doc, {
            startY: 36,
            head: [[
                "Sr.",
                "Name",
                "Email",
                "Table",
                "Items",
                "Amount",
                "Status",
                "Payment ID",
                "Date"
            ]],
            body: rows,

            theme: "grid",

            styles: {
                font: "times",
                fontSize: 10,

            },

            headStyles: {

                textColor: 255,
                fontStyle: "bold"
            },

            alternateRowStyles: {
                fillColor: [252, 247, 235]
            },

            margin: { left: 14, right: 14 }
        });


        doc.save("order-history.pdf");
        toast.success("PDF Exported", { id: "qr-menu-export-all-pdf" });
    };

    const labelOf = (item: OrderHistoryItem) => `${item.title} ×${item.quantity}`

    /** How many plates the kitchen actually has to send out. */
    const totalPlates = (items: OrderHistoryItem[]) =>
        items.reduce((sum, i) => sum + i.quantity, 0);

    const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`

    const when = (value: Date) => {
        const date = new Date(value)
        return {
            day: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
            time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        }
    }

    return (
        <div className='w-full h-full'>
            <div className='rounded-2xl bg-white shadow-xl'>

                {/* HEADER */}
                <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5'>
                    <div>
                        <h2 className='text-lg font-semibold text-gray-900'>Orders</h2>
                        <p className='text-sm text-gray-500'>
                            {loading
                                ? "Loading order history…"
                                : orderHis.length === 0
                                    ? "No orders yet"
                                    : `${orderHis.length} order${orderHis.length > 1 ? "s" : ""} · updating live`}
                        </p>
                    </div>

                    <button
                        onClick={exportItasPdf}
                        disabled={orderHis.length === 0}
                        className='flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        <FileBox size={16} />
                        Export PDF
                    </button>
                </div>

                {/* EMPTY */}
                {!loading && orderHis.length === 0 && (
                    <div className='flex flex-col items-center justify-center px-6 py-20 text-center'>
                        <div className='mb-3 rounded-full bg-gray-50 p-4'>
                            <Inbox size={28} className='text-gray-400' />
                        </div>
                        <p className='font-medium text-gray-900'>No orders yet</p>
                        <p className='mt-1 max-w-sm text-sm text-gray-500'>
                            Orders appear here the moment a guest pays. Share a table QR to get started.
                        </p>
                    </div>
                )}

                {loading && (
                    <ul className='divide-y divide-gray-100 md:hidden'>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <li key={i} className='space-y-2 px-4 py-4'>
                                <div className='h-4 w-1/3 animate-pulse rounded bg-gray-100' />
                                <div className='h-3 w-1/2 animate-pulse rounded bg-gray-100' />
                                <div className='h-3 w-2/3 animate-pulse rounded bg-gray-100' />
                            </li>
                        ))}
                    </ul>
                )}

                {/* MOBILE: one card per order. An eight-column table on a
                    phone is a horizontal-scroll puzzle, not a list. */}
                {!loading && orderHis.length > 0 && (
                    <ul className='divide-y divide-gray-100 md:hidden'>
                        {orderHis.map((item: OrderHistory) => {
                            const stamp = when(item.createdAt)

                            return (
                                <li key={item._id} className='px-4 py-4 transition-colors active:bg-gray-50'>
                                    <div className='flex items-start justify-between gap-3'>
                                        <div className='min-w-0'>
                                            <p className='truncate font-medium text-gray-900'>{item.name}</p>
                                            <p className='truncate text-xs text-gray-500'>{item.email}</p>
                                        </div>
                                        <p className='shrink-0 font-semibold text-gray-900 tabular-nums'>
                                            {money(item.amount)}
                                        </p>
                                    </div>

                                    <p className='mt-2 text-sm text-gray-700'>
                                        {item.items.map(labelOf).join(", ")}
                                    </p>

                                    <div className='mt-3 flex flex-wrap items-center gap-2'>
                                        <StatusBadge status={item.status} />
                                        {item.tableName ? (
                                            <span className='inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200'>
                                                Table {item.tableName}
                                            </span>
                                        ) : (
                                            <span className='text-xs text-gray-400'>Direct</span>
                                        )}
                                        <span className='ml-auto text-xs text-gray-400'>
                                            {stamp.day} · {stamp.time}
                                        </span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}

                {/* DESKTOP TABLE */}
                {(loading || orderHis.length > 0) && (
                    <div className='hidden w-full overflow-x-auto md:block'>
                        <Table>
                            <TableHeader>
                                <TableRow className='border-gray-100 hover:bg-transparent'>
                                    <TableHead className='w-12 pl-6 text-xs font-medium uppercase tracking-wide text-gray-500'>#</TableHead>
                                    <TableHead className='text-xs font-medium uppercase tracking-wide text-gray-500'>Customer</TableHead>
                                    <TableHead className='text-xs font-medium uppercase tracking-wide text-gray-500'>Table</TableHead>
                                    <TableHead className='text-xs font-medium uppercase tracking-wide text-gray-500'>Items</TableHead>
                                    <TableHead className='text-right text-xs font-medium uppercase tracking-wide text-gray-500'>Amount</TableHead>
                                    <TableHead className='text-xs font-medium uppercase tracking-wide text-gray-500'>Status</TableHead>
                                    <TableHead className='text-xs font-medium uppercase tracking-wide text-gray-500'>Payment ID</TableHead>
                                    <TableHead className='pr-6 text-right text-xs font-medium uppercase tracking-wide text-gray-500'>Placed</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading
                                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                    : orderHis.map((item: OrderHistory, idx) => {
                                        const stamp = when(item.createdAt)

                                        return (
                                            <TableRow key={item._id} className='border-gray-100 transition-colors hover:bg-gray-50/70'>
                                                <TableCell className='pl-6 text-sm text-gray-400 tabular-nums'>{idx + 1}</TableCell>

                                                <TableCell>
                                                    <p className='font-medium text-gray-900'>{item.name}</p>
                                                    <p className='text-xs text-gray-500'>{item.email}</p>
                                                </TableCell>

                                                <TableCell>
                                                    {item.tableName ? (
                                                        <span className='inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200'>
                                                            Table {item.tableName}
                                                        </span>
                                                    ) : (
                                                        <span className='text-xs text-gray-400'>Direct</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className='max-w-xs'>
                                                    <Tooltip content={item.items.map(labelOf).join(", ")}>
                                                        <p className='truncate text-left text-sm text-gray-700'>
                                                            {item.items.slice(0, 2).map(labelOf).join(", ")}
                                                            {item.items.length > 2 && (
                                                                <span className='text-gray-400'> +{item.items.length - 2} more</span>
                                                            )}
                                                        </p>
                                                    </Tooltip>
                                                    <p className='text-xs text-gray-400'>
                                                        {totalPlates(item.items)} item{totalPlates(item.items) > 1 ? "s" : ""}
                                                    </p>
                                                </TableCell>

                                                <TableCell className='text-right font-semibold text-gray-900 tabular-nums'>
                                                    {money(item.amount)}
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge status={item.status} />
                                                </TableCell>

                                                <TableCell>
                                                    <Tooltip content={item.paymentId}>
                                                        <p className='max-w-[9rem] truncate font-mono text-xs text-gray-500'>
                                                            {item.paymentId}
                                                        </p>
                                                    </Tooltip>
                                                </TableCell>

                                                <TableCell className='pr-6 text-right'>
                                                    <p className='text-sm text-gray-700'>{stamp.day}</p>
                                                    <p className='text-xs text-gray-400'>{stamp.time}</p>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* INFINITE SCROLL SENTINEL */}
                <div ref={baseRef} />

                {!loading && orderHis.length > 0 && !hasMore.current && (
                    <p className='border-t border-gray-100 py-4 text-center text-xs text-gray-400'>
                        End of order history
                    </p>
                )}
            </div>
        </div>
    )
}

const StatusBadge = ({ status }: { status: string }) => {
    const tone =
        status === "COMPLETED"
            ? "bg-green-50 text-green-700 ring-green-200"
            : status === "FAILED"
                ? "bg-red-50 text-red-700 ring-red-200"
                : "bg-amber-50 text-amber-700 ring-amber-200"

    const label = status.charAt(0) + status.slice(1).toLowerCase()

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}>
            <span className='h-1.5 w-1.5 rounded-full bg-current' />
            {label}
        </span>
    )
}

const SkeletonRow = () => (
    <TableRow className='border-gray-100'>
        {Array.from({ length: 8 }).map((_, i) => (
            <TableCell key={i} className={i === 0 ? "pl-6" : i === 7 ? "pr-6" : ""}>
                <div className='h-4 animate-pulse rounded bg-gray-100' />
            </TableCell>
        ))}
    </TableRow>
)

export default index
