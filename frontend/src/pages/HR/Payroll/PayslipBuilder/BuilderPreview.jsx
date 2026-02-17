import React from 'react';

// Helper function to convert number to words
const numberToWords = (num) => {
    if (!num || num === 0) return '';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    const convertBelow1000 = (n) => {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) {
            return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        }
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertBelow1000(n % 100) : '');
    };

    let words = '';
    let scaleIndex = 0;

    while (num > 0) {
        if (scaleIndex === 0) {
            const remainder = num % 1000;
            if (remainder !== 0) {
                words = convertBelow1000(remainder) + ' ' + words;
            }
            num = Math.floor(num / 1000);
        } else if (scaleIndex === 1) {
            const remainder = num % 100;
            if (remainder !== 0) {
                words = convertBelow1000(remainder) + ' ' + scales[scaleIndex] + ' ' + words;
            }
            num = Math.floor(num / 100);
        } else {
            const remainder = num % 100;
            if (remainder !== 0) {
                words = convertBelow1000(remainder) + ' ' + scales[scaleIndex] + ' ' + words;
            }
            num = Math.floor(num / 100);
        }
        scaleIndex++;
    }

    return words.trim() + ' Rupees Only';
};

export default function BuilderPreview({ config, selectedBlockId, onSelectBlock, isBuilder, previewMode, previewData }) {
    // Safety Check
    if (!config) {
        console.warn('BuilderPreview: config is undefined');
        return <div className="p-4 text-red-500 text-center">No config provided</div>;
    }

    if (!config.sections || !Array.isArray(config.sections)) {
        console.warn('BuilderPreview: config.sections is invalid', { config });
        return <div className="p-4 text-gray-500 text-center">No sections configured</div>;
    }

    const pageStyles = {
        backgroundColor: config.styles?.backgroundColor || '#ffffff',
        fontFamily: config.styles?.fontFamily || 'Inter',
        fontSize: config.styles?.fontSize || '12px',
        color: config.styles?.color || '#000000',
        padding: config.styles?.padding || '30px',
        minHeight: '100%'
    };

    return (
        <div style={pageStyles} className="relative transition-all shadow-inner">
            {config.sections.map((section) => (
                <div
                    key={section.id}
                    onClick={() => isBuilder && onSelectBlock(section.id)}
                    className={`
                        relative group transition-all
                        ${isBuilder ? 'cursor-pointer hover:bg-blue-50/30' : ''}
                        ${isBuilder && selectedBlockId === section.id ? 'ring-2 ring-blue-500 ring-inset z-10 bg-blue-50/50 shadow-sm print:ring-0 print:bg-transparent print:shadow-none' : ''}
                        print:p-0 print:m-0
                    `}
                    style={{
                        paddingTop: section.styles?.paddingTop || '0px',
                        paddingBottom: section.styles?.paddingBottom || '0px',
                        paddingLeft: section.styles?.paddingLeft || '0px',
                        paddingRight: section.styles?.paddingRight || '0px',
                        marginTop: section.styles?.marginTop || '0px',
                        marginBottom: section.styles?.marginBottom || '0px',
                    }}
                >
                    {isBuilder && (
                        <div className={`
                            builder-section-label
                            absolute -top-6 left-0 bg-blue-600 text-white text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-t-lg transition-opacity duration-200 pointer-events-none z-20 print:hidden
                            ${selectedBlockId === section.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                        `}>
                            {section.type}
                        </div>
                    )}

                    <RenderComponent type={section.type} content={section.content} globalStyles={config.styles} previewData={previewData} />
                </div>
            ))}
        </div>
    );
}

function RenderComponent({ type, content, globalStyles, previewData }) {
    // Safety Check
    if (!type) {
        console.warn('RenderComponent: No type provided');
        return <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200 text-sm">Missing component type</div>;
    }

    // Fallback content if not provided
    const safeContent = content || {};

    // Helper to extract employee data from previewData
    const getEmployeeData = (field) => {
        if (!previewData) return `[${field}]`;

        const mapping = {
            'EMPLOYEE_NAME': () => `${previewData.employeeDetails?.firstName} ${previewData.employeeDetails?.lastName}`,
            'EMPLOYEE_CODE': () => previewData.employeeDetails?.employeeCode,
            'DEPARTMENT': () => previewData.employeeDetails?.department?.name,
            'DESIGNATION': () => previewData.employeeDetails?.designation?.name,
            'DATE_OF_JOINING': () => new Date(previewData.employeeDetails?.joiningDate).toLocaleDateString(),
            'PAN_NUMBER': () => previewData.employeeDetails?.panNumber,
            'UAN_NO': () => previewData.employeeDetails?.uanNumber,
            'PF_NO': () => previewData.employeeDetails?.pfNumber,
            'BANK_NAME': () => previewData.employeeDetails?.bankDetails?.bankName,
            'ACCOUNT_NO': () => previewData.employeeDetails?.bankDetails?.accountNumber,
            'IFSC': () => previewData.employeeDetails?.bankDetails?.ifscCode,
            'MONTH_YEAR': () => new Date(previewData.payslipDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
            'NET_PAY': () => `₹ ${(previewData.netPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'GROSS_EARNINGS': () => `₹ ${(previewData.grossEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            'TOTAL_DEDUCTIONS': () => `₹ ${(previewData.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        };

        return mapping[field] ? mapping[field]() : `[${field}]`;
    };

    // Helper to replace variables with real data
    const replaceVars = (text) => {
        if (!text) return '';
        let result = text;
        const vars = [
            'EMPLOYEE_NAME', 'EMPLOYEE_CODE', 'DEPARTMENT', 'DESIGNATION', 'DATE_OF_JOINING',
            'PAN_NUMBER', 'UAN_NO', 'PF_NO', 'BANK_NAME', 'ACCOUNT_NO', 'IFSC', 'MONTH_YEAR',
            'NET_PAY', 'GROSS_EARNINGS', 'TOTAL_DEDUCTIONS'
        ];
        vars.forEach(v => {
            result = result.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), getEmployeeData(v));
        });
        return result;
    };

    switch (type) {
        case 'company-header':
            return (
                <div className={`flex items-center gap-6 ${safeContent.logoAlign === 'right' ? 'flex-row-reverse' : safeContent.logoAlign === 'center' ? 'flex-col' : 'flex-row'}`}>
                    {safeContent.showLogo && (
                        <div className="flex-shrink-0">
                            {safeContent.logoImage ? (
                                <img
                                    src={safeContent.logoImage}
                                    alt="Company Logo"
                                    style={{
                                        height: safeContent.logoSize || '80px',
                                        width: 'auto',
                                        maxWidth: safeContent.logoSize || '80px'
                                    }}
                                    className="rounded border border-gray-200 object-contain"
                                />
                            ) : (
                                <div className="bg-gray-100 rounded flex items-center justify-center border border-gray-200 font-bold text-gray-400 text-[10px] text-center p-2 uppercase" style={{ width: safeContent.logoSize || '80px', height: safeContent.logoSize || '80px' }}>
                                    LOGO
                                </div>
                            )}
                        </div>
                    )}
                    <div className={`flex-1 ${safeContent.logoAlign === 'center' ? 'text-center' : ''}`}>
                        <h1 style={{ fontSize: safeContent.companyNameSize || '24px' }} className="font-extrabold text-gray-900 leading-tight">
                            {safeContent.companyName ?? ''}
                        </h1>
                        {safeContent.showAddress && (
                            <p className="text-gray-500 mt-1 whitespace-pre-line leading-relaxed text-sm">
                                {safeContent.companyAddress ?? ''}
                            </p>
                        )}
                    </div>
                </div>
            );

        case 'payslip-title':
            return (
                <div className="py-4 border-y border-gray-100 my-4 text-center">
                    <h2 className="text-lg font-black uppercase tracking-widest text-gray-900">
                        {replaceVars(safeContent.text || 'Payslip')}
                    </h2>
                </div>
            );

        case 'text':
            return (
                <div style={{
                    textAlign: safeContent.align || 'left',
                    fontSize: safeContent.size || '14px',
                    fontWeight: safeContent.weight || 'normal',
                    color: safeContent.color || 'inherit'
                }}>
                    {replaceVars(safeContent.text)}
                </div>
            );

        case 'divider':
            return (
                <div style={{
                    height: safeContent.thickness || '1px',
                    backgroundColor: safeContent.color || '#e5e7eb',
                    borderBottomStyle: safeContent.style || 'solid',
                    width: '100%',
                    margin: '8px 0'
                }} />
            );

        case 'spacer':
            return <div style={{ height: safeContent.height || '20px' }} />;

        case 'employee-details-grid':
            return (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${safeContent.columns || 2}, 1fr)`,
                    gap: '24px 32px'
                }} className="text-[11px]">
                    {safeContent.fields?.map(f => (
                        <div key={f} className="flex justify-between border-b border-gray-50 pb-1">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">{f.replace(/_/g, ' ')}</span>
                            <span className="text-gray-900 font-semibold">{getEmployeeData(f)}</span>
                        </div>
                    ))}
                </div>
            );

        case 'earnings-table':
            return (
                <div className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">{safeContent.title || 'Earnings'}</h3>
                    <table className="w-full text-left border-collapse border border-gray-200 overflow-hidden rounded-lg">
                        <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-500">
                            <tr>
                                <th className="p-2 border border-gray-200">Description</th>
                                <th className="p-2 border border-gray-200 text-right">Amount</th>
                                {safeContent.showYTD && <th className="p-2 border border-gray-200 text-right">YTD</th>}
                            </tr>
                        </thead>
                        <tbody className="text-[11px]">
                            {safeContent.customRows && safeContent.customRows.length > 0 ? (
                                safeContent.customRows.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2 border border-gray-100">{item.name || 'Row Item'}</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ {(item.ytd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                                    </tr>
                                ))
                            ) : (
                                previewData?.earnings?.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2 border border-gray-100">{item.name || item.description}</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ {(item.ytd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                                    </tr>
                                )) || (
                                    <tr className="hover:bg-gray-50">
                                        <td className="p-2 border border-gray-100">Basic Salary</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ 0.00</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ 0.00</td>}
                                    </tr>
                                )
                            )}
                            <tr className="bg-blue-50/50 font-bold">
                                <td className="p-2 border border-gray-100 uppercase tracking-wider">Total Earnings</td>
                                <td className="p-2 border border-gray-100 text-right">
                                    ₹ {safeContent.customRows && safeContent.customRows.length > 0
                                        ? (safeContent.customRows.reduce((sum, r) => sum + (r.amount || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                        : (previewData?.grossEarnings ? (previewData.grossEarnings).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00')}
                                </td>
                                {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right">₹ 0.00</td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            );

        case 'deductions-table':
            return (
                <div className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 mb-2">{safeContent.title || 'Deductions'}</h3>
                    <table className="w-full text-left border-collapse border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-500">
                            <tr>
                                <th className="p-2 border border-gray-200">Description</th>
                                <th className="p-2 border border-gray-200 text-right">Amount</th>
                                {safeContent.showYTD && <th className="p-2 border border-gray-200 text-right">YTD</th>}
                            </tr>
                        </thead>
                        <tbody className="text-[11px]">
                            {safeContent.customRows && safeContent.customRows.length > 0 ? (
                                safeContent.customRows.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2 border border-gray-100">{item.name || 'Deduction Item'}</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ {(item.ytd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                                    </tr>
                                ))
                            ) : (
                                previewData?.deductions?.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2 border border-gray-100">{item.name || item.description}</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ {(item.ytd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                                    </tr>
                                )) || (
                                    <tr className="hover:bg-gray-50">
                                        <td className="p-2 border border-gray-100">EPF Contribution</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ 0.00</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ 0.00</td>}
                                    </tr>
                                )
                            )}
                            <tr className="bg-red-50/50 font-bold">
                                <td className="p-2 border border-gray-100 uppercase tracking-wider">Total Deductions</td>
                                <td className="p-2 border border-gray-100 text-right">
                                    ₹ {safeContent.customRows && safeContent.customRows.length > 0
                                        ? (safeContent.customRows.reduce((sum, r) => sum + (r.amount || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                        : (previewData?.totalDeductions ? (previewData.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00')}
                                </td>
                                {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right">₹ 0.00</td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            );

        case 'reimbursements-table':
            return (
                <div className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 mb-2">{safeContent.title || 'Reimbursements'}</h3>
                    <table className="w-full text-left border-collapse border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-500">
                            <tr>
                                <th className="p-2 border border-gray-200">Description</th>
                                <th className="p-2 border border-gray-200 text-right">Amount</th>
                                {safeContent.showYTD && <th className="p-2 border border-gray-200 text-right">YTD</th>}
                            </tr>
                        </thead>
                        <tbody className="text-[11px]">
                            {safeContent.customRows && safeContent.customRows.length > 0 ? (
                                safeContent.customRows.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2 border border-gray-100">{item.name || 'Reimbursement Item'}</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ {(item.ytd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                                    </tr>
                                ))
                            ) : (
                                previewData?.reimbursements?.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2 border border-gray-100">{item.name || item.description}</td>
                                        <td className="p-2 border border-gray-100 text-right font-medium">₹ {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right text-gray-400">₹ {(item.ytd || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>}
                                    </tr>
                                )) || (
                                    <tr className="hover:bg-gray-50">
                                        <td className="p-2 border border-gray-100">No reimbursements</td>
                                        <td className="p-2 border border-gray-100 text-right">₹ 0.00</td>
                                        {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right">₹ 0.00</td>}
                                    </tr>
                                )
                            )}
                            <tr className="bg-green-50/50 font-bold">
                                <td className="p-2 border border-gray-100 uppercase tracking-wider">Total Reimbursements</td>
                                <td className="p-2 border border-gray-100 text-right">
                                    ₹ {safeContent.customRows && safeContent.customRows.length > 0
                                        ? (safeContent.customRows.reduce((sum, r) => sum + (r.amount || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                        : (previewData?.totalReimbursements ? (previewData.totalReimbursements).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00')}
                                </td>
                                {safeContent.showYTD && <td className="p-2 border border-gray-100 text-right">₹ 0.00</td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            );

        case 'net-pay-box':
            return (
                <div
                    style={{ backgroundColor: safeContent.bgColor || '#f9fafb', color: safeContent.textColor || '#111827' }}
                    className="p-6 rounded-2xl border-2 border-gray-900 my-6 flex justify-between items-center shadow-lg"
                >
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{safeContent.title || 'Net Salary Payable'}</p>
                        <p className="text-xs italic opacity-80">
                            ({previewData?.netPay ? numberToWords(previewData.netPay) : 'Enter amount in words'})
                        </p>
                    </div>
                    <div className="text-right">
                        <h4 className="text-3xl font-black tracking-tighter">
                            ₹ {previewData?.netPay ? (previewData.netPay).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </h4>
                    </div>
                </div>
            );

        default:
            return <div className="p-4 bg-gray-50 text-gray-400 text-xs text-center rounded border border-dashed">Unknown Component: {type}</div>;
    }
}
