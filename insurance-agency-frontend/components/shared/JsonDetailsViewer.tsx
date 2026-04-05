'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';


interface JsonDetailsViewerProps {
    data: Record<string, unknown>;
}

export function JsonDetailsViewer({ data }: JsonDetailsViewerProps) {

    const [copied, setCopied] = useState(false);

    // Extract key fields for preview (customize based on your audit log structure)
    const getPreviewText = (details: Record<string, unknown>): string => {
        const keys = Object.keys(details);
        if (keys.length === 0) return 'No details';

        // Try to show most relevant info safely
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = details as any;
        if (d.message && typeof d.message === 'string') return d.message;
        if (d.email) return `Email: ${d.email}`;
        if (d.policy_number) return `Policy: ${d.policy_number}`;
        if (d.customer_number) return `Customer: ${d.customer_number}`;

        // Fallback: show first few fields
        const preview = keys.slice(0, 2).map(key => {
            const value = d[key];
            if (typeof value === 'string' && value.length > 30) {
                return `${key}: ${value.substring(0, 30)}...`;
            }
            return `${key}: ${JSON.stringify(value)}`;
        }).join(', ');

        return preview || 'Click to view details';
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs font-normal justify-start text-left hover:bg-accent"
                >
                    <ChevronRight className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{getPreviewText(data)}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="h-8"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy JSON
                                </>
                            )}
                        </Button>
                    </div>
                    <DialogDescription>
                        Detailed information about this audit log entry
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <JsonTree data={data} level={0} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface JsonTreeProps {
    data: unknown;
    level: number;
    propertyKey?: string;
}

function JsonTree({ data, level, propertyKey }: JsonTreeProps) {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

    const indent = level * 16;

    if (data === null) {
        return (
            <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                {propertyKey && <span className="text-muted-foreground">{propertyKey}: </span>}
                <span className="text-gray-500 italic">null</span>
            </div>
        );
    }

    if (typeof data === 'boolean') {
        return (
            <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                {propertyKey && <span className="text-muted-foreground">{propertyKey}: </span>}
                <span className="text-blue-600 font-medium">{String(data)}</span>
            </div>
        );
    }

    if (typeof data === 'number') {
        return (
            <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                {propertyKey && <span className="text-muted-foreground">{propertyKey}: </span>}
                <span className="text-purple-600 font-medium">{data}</span>
            </div>
        );
    }

    if (typeof data === 'string') {
        // Check if it's a URL
        const isUrl = data.startsWith('http://') || data.startsWith('https://');

        return (
            <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                {propertyKey && <span className="text-muted-foreground">{propertyKey}: </span>}
                {isUrl ? (
                    <a
                        href={data}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline break-all"
                    >
                        {data}
                    </a>
                ) : (
                    <span className="text-green-700">&quot;{data}&quot;</span>
                )}
            </div>
        );
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            return (
                <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                    {propertyKey && <span className="text-muted-foreground">{propertyKey}: </span>}
                    <span className="text-gray-500">[]</span>
                </div>
            );
        }

        return (
            <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center hover:bg-accent rounded px-1 -ml-1"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                        <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    {propertyKey && <span className="text-muted-foreground mr-1">{propertyKey}:</span>}
                    <span className="text-gray-500 text-sm">Array[{data.length}]</span>
                </button>
                {isExpanded && (
                    <div className="border-l-2 border-gray-200 ml-2 mt-1">
                        {data.map((item, index) => (
                            <JsonTree key={index} data={item} level={level + 1} propertyKey={`[${index}]`} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        const keys = Object.keys(obj);

        if (keys.length === 0) {
            return (
                <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                    {propertyKey && <span className="text-muted-foreground">{propertyKey}: </span>}
                    <span className="text-gray-500">{'{}'}</span>
                </div>
            );
        }

        return (
            <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center hover:bg-accent rounded px-1 -ml-1"
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                        <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    {propertyKey && <span className="text-muted-foreground mr-1">{propertyKey}:</span>}
                    <span className="text-gray-500 text-sm">Object {keys.length > 0 && `{${keys.length}}`}</span>
                </button>
                {isExpanded && (
                    <div className="border-l-2 border-gray-200 ml-2 mt-1">
                        {keys.map((key) => (
                            <JsonTree key={key} data={obj[key]} level={level + 1} propertyKey={key} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return null;
}
