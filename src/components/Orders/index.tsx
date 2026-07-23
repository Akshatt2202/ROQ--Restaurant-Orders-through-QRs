"use client"

import { FileBox } from 'lucide-react'
import React from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import Tooltip from '../common/Tooltip'
import { getApi } from '@/utils/common'
import { GET_ALL_ORDER_HISTORY, GET_ORDER_HISTORY } from '@/utils/APIConstant'
import { ApiResponse } from '@/utils/api'
import { OrderHisResponse, OrderHistory } from '@/types/orderHistory'
import toast from 'react-hot-toast'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function index() {
    const baseRef = React.useRef<HTMLDivElement>(null);
    const cursorRef = React.useRef<Date>(null);
    const hasMore = React.useRef<boolean>(true);
    const [orderHis, setOrderHis] = React.useState<OrderHistory[]>([]);
    const loadingRef = React.useRef(false)

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
            console.log(response.data.hasMore)

            hasMore.current = response.data.hasMore;

            cursorRef.current =
                list.length > 0 ? list[list.length - 1].createdAt : null;

            setOrderHis(prev => [...prev, ...list]);
        }

        loadingRef.current = false;
    };

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
        doc.setTextColor(0,0,0);
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
            o.items.join(", "),
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


    const itemFormater = (items: string[]) => items.slice(0, 2).join(", ");
    return (
        <div className='w-full h-full'>
            <div className='flex justify-between items-center'>
                <h2 className='text-xl font-bold font-serif'>Order <span className='text-transparent bg-linear-to-r from-blue-600 via-cyan-500 to-blue-500 bg-clip-text'>'s</span></h2>
                <div onClick={exportItasPdf} className='flex cursor-pointer items-center gap-1 px-2 py-1 rounded-full bg-orange-300/25 hover:bg-orange-400/25 transition-all duration-150 ease-in border border-orange-300'>
                    <FileBox size={16} />
                    <span >Export As PDF</span>
                </div>

            </div>

            <div className='w-full overflow-auto'>
                <Table>
                    <TableCaption>A list of your orders {new Date().toLocaleDateString()}.</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead >Sr.</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-left">Items</TableHead>
                            <TableHead className="text-center">Amount</TableHead>
                            <TableHead className="text-center">Paid</TableHead>
                            <TableHead className="text-center">PaymentId</TableHead>
                            <TableHead className="text-center">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orderHis.map((item: OrderHistory, idx) => (
                            <TableRow key={item._id}>
                                <TableCell className="font-medium">{idx}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>
                                    <p className='text-left'>{item.email}</p>
                                </TableCell>
                                <TableCell className="">
                                    <Tooltip content={String(item.items)}>
                                        <p>{itemFormater(item.items)} {item.items.length > 2 && `+${item.items.length - 2} more`}</p>
                                    </Tooltip>
                                </TableCell>
                                <TableCell className="text-center">{item.amount}</TableCell>
                                <TableCell className="text-center">{item.status}</TableCell>

                                <TableCell className='text-center' >
                                    <p className="font-mono">{item.paymentId}</p>
                                </TableCell>

                                <TableCell className="text-center">{new Date(item.createdAt).toLocaleDateString()}</TableCell>

                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div ref={baseRef} />

        </div>
    )
}

export default index